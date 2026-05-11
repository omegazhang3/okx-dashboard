#!/usr/bin/env python3
"""
加密市场每日简报 - 结构化分析
输出格式: 🔴高优先级 🟡中优先级 🟢观察列表 ⚠️风险提示
"""
import json
import sys
import os
import re
from datetime import datetime

sys.path.insert(0, os.path.expanduser('~/venv/scrapling/lib/python3.12/site-packages'))
from scrapling.fetchers import Fetcher, StealthyFetcher

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", file=sys.stderr)

def jina_extract(url):
    import urllib.request
    try:
        jina_url = f"https://r.jina.ai/{url}"
        req = urllib.request.Request(jina_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        log(f"  ❌ Jina 失败: {e}")
        return None

def format_number(num_str):
    """格式化数字: 426,385,280 -> $4.26亿"""
    try:
        num = int(num_str.replace(',', ''))
        if num >= 1e8:
            return f"${num/1e8:.2f}亿"
        elif num >= 1e4:
            return f"${num/1e4:.0f}万"
        else:
            return f"${num}"
    except:
        return num_str

def fetch_cmc_gainers():
    """CoinMarketCap 24h涨幅榜"""
    log("📊 CoinMarketCap...")
    try:
        page = StealthyFetcher.fetch('https://coinmarketcap.com/gainers-losers/', headless=True, solve_cloudflare=True, disable_resources=True)
        text = ' '.join(page.css('body ::text').getall())
        
        # 匹配: Symbol $Price +Change% $Volume (逗号分隔)
        matches = re.findall(r'([A-Z]{2,10})\s+\$?(\d+\.?\d*)\s+\+?(\d+\.?\d*)%\s+\$?([\d,]+)', text)
        
        gainers = []
        for m in matches[:15]:
            vol_num = int(m[3].replace(',',''))
            gainers.append({
                'symbol': m[0],
                'price': float(m[1]),
                'change': float(m[2]),
                'volume': vol_num,
                'volume_str': f"${vol_num/1e6:.1f}M" if vol_num >= 1e6 else f"${vol_num/1e4:.0f}万"
            })
        return gainers
    except Exception as e:
        log(f"  ❌ CMC 失败: {e}")
        return None

def fetch_coinglass():
    """CoinGlass 合约数据"""
    log("📊 CoinGlass...")
    result = {'global': {}, 'oi_changes': [], 'long_short': {}, 'top_gainers': []}
    
    try:
        page = StealthyFetcher.fetch('https://www.coinglass.com/zh', headless=True, solve_cloudflare=True, disable_resources=True)
        text = ' '.join(page.css('body ::text').getall())
        
        # 全局指标 - 使用逗号分隔的数字格式
        oi_match = re.search(r'全网合约持仓量\s*\$?([\d,]+)', text)
        liq_match = re.search(r'24小时爆仓\s*\$?([\d,]+)', text)
        vol_match = re.search(r'全网24小时合约成交额\s*\$?([\d,]+)', text)
        fear_match = re.search(r'恐惧.*?指数.*?(\d+)', text)
        
        result['global'] = {
            'oi': format_number(oi_match.group(1)) if oi_match else 'N/A',
            'liquidation': format_number(liq_match.group(1)) if liq_match else 'N/A',
            'volume': format_number(vol_match.group(1)) if vol_match else 'N/A',
            'fear_greed': int(fear_match.group(1)) if fear_match else 50
        }
        
        # 合约涨幅榜 (从表格提取)
        # 匹配模式: Name Symbol $Price Change% $Volume
        gainers = re.findall(r'([A-Z]{2,10})\s+\$?(\d+\.?\d*)\s+\+?(\d+\.?\d*)%\s+\$?([\d,]+)', text)
        result['top_gainers'] = [{'symbol': g[0], 'price': float(g[1]), 'change': float(g[2])} for g in gainers[:5]]
        
    except Exception as e:
        log(f"  ❌ CoinGlass 全局失败: {e}")
    
    # 多空比
    try:
        page = StealthyFetcher.fetch('https://www.coinglass.com/zh/LongShortRatio', headless=True, solve_cloudflare=True, disable_resources=True)
        text = ' '.join(page.css('body ::text').getall())
        
        # 匹配多空比数据
        binance_match = re.search(r'Binance.*?(\d+\.?\d*)%', text)
        okx_match = re.search(r'OKX.*?(\d+\.?\d*)%', text)
        
        if binance_match:
            result['long_short']['binance'] = float(binance_match.group(1)) / 100
        if okx_match:
            result['long_short']['okx'] = float(okx_match.group(1)) / 100
            
    except Exception as e:
        log(f"  ❌ 多空比失败: {e}")
    
    return result

def fetch_coindesk():
    """CoinDesk 最新文章"""
    log("📰 CoinDesk...")
    articles = []
    
    try:
        page = StealthyFetcher.fetch('https://www.coindesk.com', headless=True, solve_cloudflare=True, disable_resources=True)
        links = page.css('a[href*="/markets/"]::attr(href), a[href*="/news/"]::attr(href), a[href*="/tech/"]::attr(href)').getall()
        
        urls = []
        for link in links:
            if link.startswith('/'):
                link = 'https://www.coindesk.com' + link
            if link not in urls:
                urls.append(link)
            if len(urls) >= 5:
                break
        
        for url in urls[:3]:
            try:
                text = jina_extract(url)
                if text:
                    title = re.search(r'^#\s+(.+)', text, re.MULTILINE)
                    articles.append({
                        'title': title.group(1).strip()[:80] if title else 'N/A',
                        'url': url,
                        'content': text[:800]
                    })
            except:
                pass
    except Exception as e:
        log(f"  ❌ CoinDesk 失败: {e}")
    
    return articles

def analyze_and_generate_report(cmc, coinglass, coindesk):
    """分析数据并生成结构化简报"""
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    
    global_data = coinglass.get('global', {})
    ls = coinglass.get('long_short', {})
    fear_greed = global_data.get('fear_greed', 50)
    
    lines = []
    lines.append("📊 加密市场每日简报")
    lines.append(f"🕐 {now}")
    lines.append("")
    
    # ═══════════════════════════════════════════════════════
    # 🔴 高优先级信号
    # ═══════════════════════════════════════════════════════
    lines.append("🔴 **高优先级信号**")
    lines.append("")
    
    signal_num = 1
    
    # 涨幅 > 10% 的代币
    if cmc:
        top_movers = [c for c in cmc if c['change'] >= 10]
        for m in top_movers[:3]:
            lines.append(f"{signal_num}. [行情异动] {m['symbol']} 24h +{m['change']:.1f}%，成交量 {m['volume_str']}")
            
            # 分析驱动因素
            if m['volume'] > 1e9:
                lines.append(f"   → 成交量巨大，机构资金介入")
            elif m['volume'] > 1e8:
                lines.append(f"   → 成交量活跃，关注持续性")
            else:
                lines.append(f"   → 成交量一般，注意假突破")
            lines.append("")
            signal_num += 1
    
    # 多空比信号
    if ls.get('binance'):
        bn_ls = ls['binance']
        if bn_ls < 0.75:
            lines.append(f"{signal_num}. [合约信号] BTC多空比 {bn_ls:.2f} (Binance)，散户偏空")
            lines.append(f"   → 恐惧贪婪指数 {fear_greed}/100")
            lines.append(f"   → 多空比极端偏空，警惕轧空风险")
        elif bn_ls > 1.25:
            lines.append(f"{signal_num}. [合约信号] BTC多空比 {bn_ls:.2f} (Binance)，散户偏多")
            lines.append(f"   → 恐惧贪婪指数 {fear_greed}/100")
            lines.append(f"   → 多空比极端偏多，警惕回调风险")
        else:
            lines.append(f"{signal_num}. [合约信号] BTC多空比 {bn_ls:.2f} (Binance)")
            lines.append(f"   → 恐惧贪婪指数 {fear_greed}/100")
            if fear_greed < 40:
                lines.append(f"   → 市场恐惧，可能是抄底机会")
            elif fear_greed > 60:
                lines.append(f"   → 市场贪婪，注意回调风险")
            else:
                lines.append(f"   → 市场中性，等待方向明确")
        lines.append("")
        signal_num += 1
    
    # 合约涨幅榜
    cg_gainers = coinglass.get('top_gainers', [])
    if cg_gainers:
        top_cg = cg_gainers[0] if cg_gainers else None
        if top_cg and top_cg['change'] >= 15:
            lines.append(f"{signal_num}. [OI异动] {top_cg['symbol']} 合约涨幅 +{top_cg['change']:.1f}%")
            # 检查现货是否同步
            spot_match = next((c for c in cmc if c['symbol'] == top_cg['symbol']), None) if cmc else None
            if spot_match:
                diff = top_cg['change'] - spot_match['change']
                if diff > 5:
                    lines.append(f"   → 合约涨幅 > 现货，杠杆资金推动")
                else:
                    lines.append(f"   → 现货同步 +{spot_match['change']:.1f}%，量价齐升")
            lines.append("")
            signal_num += 1
    
    # ═══════════════════════════════════════════════════════
    # 🟡 中优先级
    # ═══════════════════════════════════════════════════════
    lines.append("🟡 **中优先级**")
    lines.append("")
    
    mid_num = 4
    
    # 关键新闻
    if coindesk:
        for a in coindesk[:2]:
            title = a['title'][:50] + "..." if len(a['title']) > 50 else a['title']
            lines.append(f"{mid_num}. [新闻] {title}")
            
            # 分析新闻类型
            content = a.get('content', '')
            if any(kw in content.lower() for kw in ['bitcoin', 'btc', '比特币']):
                lines.append(f"   → BTC相关消息，影响主流情绪")
            elif any(kw in content.lower() for kw in ['sec', 'regulation', '监管']):
                lines.append(f"   → 监管消息，注意政策风险")
            elif any(kw in content.lower() for kw in ['defi', 'nft', 'web3']):
                lines.append(f"   → 生态消息，关注板块轮动")
            lines.append("")
            mid_num += 1
    
    # 中等涨幅 5-10%
    if cmc:
        mid_movers = [c for c in cmc if 5 <= c['change'] < 10]
        for m in mid_movers[:2]:
            lines.append(f"{mid_num}. [行情] {m['symbol']} +{m['change']:.1f}% | ${m['price']} | {m['volume_str']}")
            lines.append("")
            mid_num += 1
    
    # ═══════════════════════════════════════════════════════
    # 🟢 观察列表
    # ═══════════════════════════════════════════════════════
    lines.append("🟢 **观察列表**")
    lines.append("")
    
    if cmc:
        watchlist = [c for c in cmc if 3 <= c['change'] < 5]
        for w in watchlist[:3]:
            lines.append(f"• {w['symbol']} ${w['price']} | +{w['change']:.1f}% | {w['volume_str']}")
    
    lines.append("")
    
    # ═══════════════════════════════════════════════════════
    # ⚠️ 风险提示
    # ═══════════════════════════════════════════════════════
    lines.append("⚠️ **风险提示**")
    lines.append("")
    
    liq = global_data.get('liquidation', 'N/A')
    oi = global_data.get('oi', 'N/A')
    vol = global_data.get('volume', 'N/A')
    
    lines.append(f"- 24h爆仓 {liq}，持仓 {oi}，成交 {vol}")
    lines.append(f"- 恐惧贪婪指数 {fear_greed}/100")
    
    if ls.get('binance') and ls['binance'] < 0.75:
        lines.append("- 多空比极端偏空，警惕轧空风险")
    elif ls.get('binance') and ls['binance'] > 1.25:
        lines.append("- 多空比极端偏多，警惕插针风险")
    
    # 从新闻提取宏观事件
    macro_keywords = ['美联储', 'Fed', 'CPI', '利率', '讲话', 'inflation', 'rate']
    has_macro = False
    for a in coindesk:
        for kw in macro_keywords:
            if kw.lower() in a.get('content', '').lower():
                has_macro = True
                break
    if has_macro:
        lines.append("- 宏观事件待关注（见头条）")
    
    lines.append("")
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    
    return '\n'.join(lines)

if __name__ == '__main__':
    log("🚀 开始抓取...")
    
    cmc = fetch_cmc_gainers()
    coinglass = fetch_coinglass()
    coindesk = fetch_coindesk()
    
    report = analyze_and_generate_report(cmc, coinglass, coindesk)
    
    # 输出到 stdout
    print(report)
    
    # 保存
    with open('/tmp/crypto_daily_report.txt', 'w') as f:
        f.write(report)
    
    log("✅ 完成")
