  
  function setup() {
    let c1 = color('#c3503b');
    let c2 = color('#f3df59');
    let c3 = color('#4278a6');
    let c4 = color('#121213');
    let c5 = color('#000');
    let strokes;
    // let randomv = 
    createCanvas(displayWidth, displayHeight, SVG);
    strokeWeight(strokes);
    noStroke();
    noFill();

    for(let r = 1; r < 2; r++) {
      let colors = [c1, c2, c3, c4];
      let color = random(colors);
      let strokes = random(3, 15);
      strokeWeight(strokes);
      stroke(color);
      // fill(color);
      
      beginShape();
    for(let i = 0; i < 14; i++) {
      // fill(c5);
      // fill('#fff');
      const x = random(50, width-50);
      const y = random(50, height - 150);
      curveVertex(x, y);
      // vertex(x, y);
      if(i < 7){
      let color = random(colors);
      // fill(c5);
      // fill(color);
      stroke(color);
      circle(x, y, 50); 
      // curveVertex(x, y);
     
      endShape(CLOSE);
      // circle(x, y, 200); 
      // fill(c5);
    }
    // fill('#fff');
      // if(i==5){
      //   fill(c4);
      //   circle(200, 100, 150); 
      //   // curveVertex(x, y);
      //   // fill(color);
      // }
    }
    
    endShape(CLOSE);
  }
        // fill(c4);
        // circle(200, 100, 150); 
        // fill(c3);
        // circle(800, 90, 50); 
        noLoop();
  }
  save_canvas = function() {
    save();
  }