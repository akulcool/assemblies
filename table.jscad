function main() {
  // Shelf dimensions
  var shelfWidth = 60;
  var shelfHeight = 30;
  var shelfDepth = 10;

  // Side panels (vertical)
  var sidePanel = CSG.roundedCube({ radius: shelfDepth, roundradius: 0, resolution: 16 }).translate([0, 0, shelfHeight / 2]);

  // Back panel (flat)
  var backPanel = CSG.roundedCube({ radius: shelfWidth, roundradius: 0, resolution: 16 }).translate([0, -shelfDepth / 2, shelfHeight / 2]);

  // Shelves (horizontal)
  var shelf1 = CSG.roundedCube({ radius: shelfWidth, roundradius: 0, resolution: 16 }).translate([0, 0, shelfHeight / 3]);
  var shelf2 = CSG.roundedCube({ radius: shelfWidth, roundradius: 0, resolution: 16 }).translate([0, 0, 2 * shelfHeight / 3]);
  
  // Combine all parts into the bookshelf
  return sidePanel.union(backPanel).union(shelf1).union(shelf2);
}
