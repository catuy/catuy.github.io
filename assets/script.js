$(document).ready(function(){
  $("img").each(function() {
      $(this).wrap("<div class='image-wrap'></div>");
      $('<div class="wrap-header"></div>').insertBefore(this);
  });
  $("video").each(function() {
      $(this).wrap("<div class='image-wrap'></div>");
      $('<div class="wrap-header"></div>').insertBefore(this);
  });
  let i = 0;
  $(".image-wrap").mousedown(function() {
      i++;
      $(this).draggable();
      $(this).css("z-index", i + 1);
  });
  // Hide all divs
  $(".image-wrap").hide();
  // Keep track of which div to show next
  var divIndex = 0;
  $(".item").click(function(event) {
      // Get the click coordinates
      var x = event.pageX;
      var y = event.pageY;
      // Show the next div
      $(".image-wrap").eq(divIndex).show();
      i++;
      $(".image-wrap").eq(divIndex).css({
          "z-index": i + 1,
          // Center the div on the click coordinates
          "left": x - ($(".image-wrap").eq(divIndex).width() / 2),
          "top": y - ($(".image-wrap").eq(divIndex).height() / 2)
      });
      $(".image-wrap").eq(divIndex).draggable();
      // Agregamos el div para contener el número consecutivo
      var numConsecutivo = $("<div class='num-consecutivo'></div>");
      numConsecutivo.html('[' + (divIndex + 1) + '/' + $(".image-wrap").length + ']');
      $(".image-wrap").eq(divIndex).append(numConsecutivo);
      // Increment the div index
      divIndex++;
  });

  $(".wrap-header").click(function(event) {
      // currentDiv.hide();
  });
});
