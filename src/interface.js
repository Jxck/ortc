(function() {
  "use strict";
  let button = document.createElement('button');
  button.textContent = 'interface';
  document.getElementById('abstract').appendChild(button);
  button.addEventListener('click', () => {
    let idl = document.querySelectorAll('pre.idl');
    document.body.innerHTML = '';
    for (let i=0; i<idl.length; i++) {
      document.body.appendChild(idl[i]);
    }
  });
})();
