const {normalizeMarkdown:n,mathHtml,convertPaste,codeContext}=window.qyyPasteTestApi;const Parser=DOMParser;const assert={equal(a,b,label){if(a!==b)throw Error(label+": "+JSON.stringify({actual:a,expected:b}));}};
let count=0;const eq=(a,b,label)=>{assert.equal(a,b,label);count++};
for(const [a,b] of [
 [String.raw`\[ \boxed{g(h_t)=M_A(t)\land M_B(t)} \]`,'$$\n'+String.raw`\boxed{g(h_t)=M_A(t)\land M_B(t)}`+'\n$$'],
 [String.raw`\\[ x=1 \\]`,'$$\nx=1\n$$'],
 [String.raw`\( x_i \)`,'$x_i$'],
 [String.raw`a \\( x_i \\) b`,'a $x_i$ b'],
 [String.raw`\[\begin{matrix}a&b\\c&d\end{matrix}\]`,'$$\n'+String.raw`\begin{matrix}a&b\\c&d\end{matrix}`+'\n$$'],
 ['**概念是什么： **关键词','**概念是什么：** 关键词'],
 ['**概念是什么：**关键词','**概念是什么：** 关键词'],
 [String.raw`前文 \[x=1\] 后文`,'前文 \n\n$$\nx=1\n$$\n\n 后文'],
 [String.raw`1. \[x=1\]`,'1. $$\n   x=1\n   $$'],
 ['** hello **',' **hello** '],
 ['*** 重点 ***',' ***重点*** '],
 [String.raw`> \[x=1\]`,'> $$\n> x=1\n> $$'],
 [String.raw`| \(x_i\) | \[y=2\] |`,'| $x_i$ | $y=2$ |'],
 [String.raw`\[x+\text{$y$}=1\]`,'$$\n'+String.raw`x+\text{$y$}=1`+'\n$$']
])eq(n(a),b,a);
for(const s of [
 String.raw`code: \[plain words\]`, String.raw`\[unfinished x=1`, String.raw`\*\*literal\*\*`,
 String.raw`\\\[x=1\\\]`,
 '$x_i$ and $$x=1$$', '售价 $20，另一个 $30',
 '`'+String.raw`\[x=1\] ** a **`+'`',
 '```latex\n'+String.raw`\[x=1\] ** a **`+'\n```',
 '~~~\n'+String.raw`\(x\)`+'\n~~~',
 '    '+String.raw`\[x=1\]`,
 String.raw`[a](https://example.com/\(x\)) ![image](a.png) [[内部链接]]`,
 '> 原有引用\n> 第二行', '1. 列表\n2. 列表', '|a|b|\n|-|-|\n|1|2|',
 String.raw`\begin{matrix}a&b\\c&d\end{matrix}`,
])eq(n(s),s,'unchanged '+s);
for(const s of [String.raw`\[x=1\]`, '** x **',String.raw`\(x\) and \[y=2\]`])eq(n(n(s)),n(s),'idempotent');
const html='<p>前文</p><span class="katex-display"><span class="katex"><span class="katex-mathml"><math><semantics><mi>x</mi><annotation encoding="application/x-tex">x_i=1</annotation></semantics></math></span><span class="katex-html">duplicate</span></span></span><p>后文</p>';
const h=mathHtml(html,Parser);eq(h.count,1,'one math');eq(h.html.includes('duplicate'),false,'remove visual duplicate');
eq(h.restore(h.html.match(/QYYMATH\w+Z/)[0]),'$$\nx_i=1\n$$','display');
const inline=mathHtml('<p>a <span class="katex"><math><annotation encoding="application/x-tex">x</annotation></math><b>x</b></span> b</p>',Parser);
eq(inline.restore(inline.html.match(/QYYMATH\w+Z/)[0]),'$x$','inline');
eq(mathHtml('<pre><code><span data-math="x=1">literal</span></code></pre>',Parser).count,0,'HTML code');
eq(mathHtml('<img alt="normal image" src="x.png">',Parser).count,0,'image kept');
eq(mathHtml('<script type="math/tex; mode=display">a=1</script>',Parser).count,1,'mathjax');
eq(mathHtml('<div data-math="a=1">a=1</div>',Parser).count,1,'data-math');
eq(mathHtml('<p>\\[x=1\\]</p><strong>重点</strong>',Parser).count,1,'latex inside rich HTML');
eq(mathHtml('<p>**重点**</p><img src="a.png">',Parser).rich,true,'image prevents lossy plain preference');
eq(convertPaste('<p>**重点**</p><img src="a.png">','**重点**',()=> '**重点**\n![image](a.png)',Parser),'**重点**\n![image](a.png)','image retained with Markdown-looking text');
eq(convertPaste('<p>**重点**</p>','**重点**',()=>String.raw`\*\*重点\*\*`,Parser),'**重点**','no double escape');
eq(convertPaste('',String.raw`\[x=1\]`,()=>null,Parser),'$$\nx=1\n$$','plain latex');
eq(convertPaste('','ordinary',()=>null,Parser),null,'ordinary pass through');
const editor=(s,ch)=>({getCursor:()=>({line:s.split('\n').length-1,ch:ch??s.split('\n').at(-1).length}),getRange:()=>s,getLine:()=>s.split('\n').at(-1)});
for(const s of ['```js\nconst x = ', '~~~\nabc','`foo','    code'])eq(codeContext(editor(s)),true,'code context');
for(const s of ['ordinary','```\nx\n```\ntext','`done` text'])eq(codeContext(editor(s)),false,'prose context');
window.qyyCoreCount=count;
