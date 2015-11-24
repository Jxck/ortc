window.addEventListener('load', function() {
  "use strict";

  // document.body.style.padding = "1em";
  // document.body.style.backgroundImage = "url()";

  let n = 27;
  for(let i=1; i<n; i++) {
    let ex = i<10 ? "0" : "";
    ex += i.toString();

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `src/ex${ex}.js`, false);
    xhr.send(null);

    let src = xhr.responseText;
    let pre = document.querySelector(`pre[data-example="${ex}"]`);
    if (pre === null) continue;
    pre.textContent = src;
  }
});
