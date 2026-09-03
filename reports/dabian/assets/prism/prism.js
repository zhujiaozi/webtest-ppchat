// Minimal Prism.js for basic highlighting
(function(){
  if (typeof self === 'undefined' || !self.Prism) {
    const Prism = {
      highlight: function(text, grammar) {
        return text;
      }
    };
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = Prism;
    }
    if (typeof global !== 'undefined') {
      global.Prism = Prism;
    }
    self.Prism = Prism;
  }
})();
