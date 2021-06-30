let vertices = []; 
let img;
function preload() {
  img = loadImage('prueba.png');
}
  
function setup() { 
  createCanvas(displayWidth, displayHeight, SVG);
  background(240);
  
} 
  
function mouseClicked() { 
  // Update the vertices array with 
  // current mouse position 
  vertices.push({ x: mouseX, y: mouseY }); 
  fill(40);
  clear(); 
  
  // noFill(); 
  
  // Draw shape using the current vertices array 
  beginShape(); 
  for (let i = 0; i < vertices.length; i++) 
  curveVertex(vertices[i].x, vertices[i].y); 
    endShape(CLOSE); 
  
  fill("red"); 
  // Draw a circle at all the vertices 
  for (let i = 0; i < vertices.length; i++) 
    circle(vertices[i].x, vertices[i].y, 15); 
} 

save_canvas = function() {
save();
}