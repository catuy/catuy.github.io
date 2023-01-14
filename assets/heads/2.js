<script>

var sketch1 = function(p) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', 'blue');
  root.style.setProperty('--second-color', '#ffffff');
  colores = ['#0000ff', '#ffffff']; 
  // head_color = 0X0000ff;
  background_color = 'blue';
  p.setup = function() {
    p.a = p.random(colores);
    p.b = p.random(20,250);
    p.c = p.random(20,250);
    p.createCanvas(p.displayWidth, p.displayHeight);
    p.background(background_color);
    p.fill(p.a);
    p.noStroke();
    p.rectMode(p.CENTER);
    p.noLoop();
  };
  
 
};

var myp5_1 = new p5(sketch1);
</script>
