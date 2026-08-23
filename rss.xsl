<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="rss/channel/title"/> · RSS</title>
        <style>
          :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0c0d0c;color:#f1f0e9;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}main{width:min(920px,90vw);margin:auto;padding:80px 0 110px}.kicker{color:#c9ff4a;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.15em;text-transform:uppercase}h1{max-width:780px;margin:22px 0 18px;font-size:clamp(44px,8vw,90px);line-height:.92;letter-spacing:-.065em}header p{max-width:660px;color:#a6a79f;font-size:18px;line-height:1.65}header a{display:inline-block;margin-top:18px;color:#c9ff4a}section{margin-top:70px;border-top:1px solid rgba(241,240,233,.18)}article{padding:34px 0;border-bottom:1px solid rgba(241,240,233,.18)}article time{color:#777a72;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}article h2{margin:12px 0;font-size:clamp(28px,4vw,44px);letter-spacing:-.04em}article p{max-width:700px;margin:0 0 18px;color:#b9bbb3;line-height:1.65}article a{color:#c9ff4a;text-transform:uppercase;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-decoration:none}.note{margin-top:46px;padding:18px;border:1px solid rgba(201,255,74,.25);color:#92958d;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}@media(max-width:600px){main{padding-top:50px}}
        </style>
      </head>
      <body><main>
        <header><p class="kicker">Technical field notes / RSS</p><h1><xsl:value-of select="rss/channel/title"/></h1><p><xsl:value-of select="rss/channel/description"/></p><a href="https://diaznakh.github.io/#writing">← Back to portfolio</a></header>
        <section><xsl:for-each select="rss/channel/item"><article><time><xsl:value-of select="pubDate"/></time><h2><xsl:value-of select="title"/></h2><p><xsl:value-of select="description"/></p><a><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>Read article ↗</a></article></xsl:for-each></section>
        <p class="note">This is still a valid RSS feed. The presentation above is only for people opening the XML in a browser; feed readers continue to receive the original RSS data.</p>
      </main></body>
    </html>
  </xsl:template>
</xsl:stylesheet>
