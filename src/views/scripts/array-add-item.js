document.querySelectorAll(".add-item-btn").forEach(btn => {
  btn.onclick = e => {
    const container = btn.parentNode.querySelector(".container");
    const fields = btn.parentNode.querySelector(".fields");
    container.appendChild(fields.cloneNode(true));
  };
});
