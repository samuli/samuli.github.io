function toggleMenu() {
  var c = "collapse";
  var x = document.getElementById("navi-container");
  if (x.classList.contains(c)){
    x.classList.remove(c);
  } else {
    x.classList.add(c);
  }
}
