module.exports = {
  createCanvas: function createCanvas() {
    throw new Error("canvas is not available in browser runtime");
  },
};
