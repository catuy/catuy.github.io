// Credenciales válidas (esto es solo para demostración; no es seguro para producción)
const validUsers = {
    "admin": "password123",  // Usuario: admin, Contraseña: password123
    "editor": "editor123"    // Usuario: editor, Contraseña: editor123
  };
  
  // Manejar el formulario de inicio de sesión
  document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
  
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    if (validUsers[username] && validUsers[username] === password) {
      // Guardar el estado de autenticación en localStorage
      localStorage.setItem("authenticated", "true");
      // Redirigir al CMS
      window.location.href = "/admin/";
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  });
  
  // Verificar autenticación al cargar el CMS
  if (window.location.pathname.includes("/admin/")) {
    if (localStorage.getItem("authenticated") !== "true") {
      window.location.href = "/login.html";
    }
  }