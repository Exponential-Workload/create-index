Test Readme File
hi

<h2>safe</h2>
<a href="hi">hello</a>
<a href="https://example.com">example.com</a>
<https://example.com> <- not an anchor

<h2>xss test</h2>
<a href="javascript:alert('hi')">xss</a>
<a href="javjavascript:ascript:alert('hi')">funny xss</a>
<a href="." onclick="alert('hi')">xss via onclick</a>

<h2>false pos check</h2>
javascript:alert('hi')
jAvaScrIpt:alert('hi')
