document.addEventListener('DOMContentLoaded', () => {
  const pres = document.querySelectorAll('pre');
  pres.forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-button';
    btn.textContent = '复制';
    btn.onclick = () => {
      const code = pre.querySelector('code');
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = '已复制!';
        setTimeout(() => btn.textContent = '复制', 2000);
      });
    };
    pre.appendChild(btn);
  });
});
