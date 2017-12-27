(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['layouts/default'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function";

  return "<!DOCTYPE html>\n<html>\n<head>\n  <title>"
    + container.escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</title>\n  <link rel=\"stylesheet\" type=\"text/css\" href=\"/assets/styles.css\">\n  <link rel=\"stylesheet\" type=\"text/css\" href=\"/resources/tether/dist/css/tether.min.css\">\n  <link rel=\"stylesheet\" type=\"text/css\" href=\"/resources/bootstrap/dist/css/bootstrap.min.css\">\n</head>\n<body>\n"
    + ((stack1 = container.invokePartial(partials.header,depth0,{"name":"header","data":data,"indent":"  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(partials.content,depth0,{"name":"content","data":data,"indent":"  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(partials.footer,depth0,{"name":"footer","data":data,"indent":"  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n  <script type=\"text/javascript\">\n    window.Global = "
    + ((stack1 = ((helper = (helper = helpers.model || (depth0 != null ? depth0.model : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"model","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + ";\n  </script>\n  <script type=\"text/javascript\" src=\"/resources/handlebars/dist/handlebars.min.js\"></script>\n  <script type=\"text/javascript\" src=\"/resources/tether/dist/js/tether.min.js\"></script>\n  <script type=\"text/javascript\" src=\"/resources/jquery/dist/jquery.slim.min.js\"></script>\n  <script type=\"text/javascript\" src=\"/resources/bootstrap/dist/js/bootstrap.min.js\"></script>\n  <script type=\"text/javascript\" src=\"/assets/templates.js\"></script>\n  <script type=\"text/javascript\" src=\"/assets/app.js\"></script>\n"
    + ((stack1 = container.invokePartial(partials["more-scripts"],depth0,{"name":"more-scripts","data":data,"indent":"  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</body>\n</html>\n";
},"usePartial":true,"useData":true});
templates['layouts/footer'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "";
},"useData":true});
templates['layouts/header'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<nav class=\"navbar navbar-expand-lg navbar-light bg-light\">\n  <div class=\"container\">\n    <a class=\"navbar-brand\" href=\"#\">Navbar</a>\n    <button class=\"navbar-toggler\" type=\"button\" data-toggle=\"collapse\" data-target=\"#navbarNavAltMarkup\" aria-controls=\"navbarNavAltMarkup\" aria-expanded=\"false\" aria-label=\"Toggle navigation\">\n      <span class=\"navbar-toggler-icon\"></span>\n    </button>\n    <div class=\"collapse navbar-collapse\" id=\"navbarNavAltMarkup\">\n      <div class=\"navbar-nav\">\n        <a class=\"nav-item nav-link active\" href=\"#\">Home <span class=\"sr-only\">(current)</span></a>\n        <a class=\"nav-item nav-link\" href=\"#\">Features</a>\n        <a class=\"nav-item nav-link\" href=\"#\">Pricing</a>\n        <a class=\"nav-item nav-link disabled\" href=\"#\">Disabled</a>\n      </div>\n    </div>\n  </div>\n</nav>\n";
},"useData":true});
templates['startup/templates/app'] = template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    return "";
},"2":function(container,depth0,helpers,partials,data) {
    return "    <div class=\"container\">\n      <div class=\"row\">\n        <div class=\"col-4\">My name is Elliott!</div>\n        <div class=\"col-4\">Hello world!</div>\n        <div class=\"col-4\">This is a basic grid.</div>\n      </div>\n    </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "    <script>Global.Startup.Presenters.App();</script>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = container.invokePartial(partials["layouts/default"],depth0,{"name":"layouts/default","fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"1_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"args":["content"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"args":["more-scripts"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();