var Resource = require('deployd/lib/resource')
        , Script = require('deployd/lib/script')
        , util = require('util');

function RouterEventResource() {
    Resource.apply(this, arguments);
}
util.inherits(RouterEventResource, Resource);

RouterEventResource.label = "Router Event";
RouterEventResource.defaultPath = "/middleware";
RouterEventResource.events = ["get", "post", "put", "delete", "beforerequest"];

module.exports = RouterEventResource;

RouterEventResource.prototype.clientGeneration = false;

RouterEventResource.prototype.handle = function (ctx, next) {
    var parts = ctx.req.url.split('?')[0].split('/').filter(function (p) {
        return p;
    }),
            resource = parts.shift();

    // pass dashboard and its activities through
    if (["dashboard", "dpd.js", "__resources"].indexOf(resource) !== -1)
        return next();

    var result = {},
            skipped = false;

    var domain = {
        url: ctx.url
        , resource: resource
        , parts: parts
        , query: ctx.query
        , body: ctx.body
        , 'this': result
        , getHeader: function (name) {
            if (ctx.req.headers) {
                return ctx.req.headers[name];
            }
        }
        , setHeader: function (name, value) {
            if (ctx.res.setHeader) {
                ctx.res.setHeader(name, value);
            }
        }
        , skip: function () {
            skipped = true;
            next();
        }
        , kill: function (err, response) {
            if (response) result = response;
            ctx.done(err, result);
        }
        , killIf: function (logic, err, response) {
            if (logic) domain.kill(err, response);
        }
    };

    this.events.beforerequest.run(ctx, domain, function (err) {
        if (err)
            ctx.done(err, result);

        delete domain.skip;
        domain.proceed = next;
        if (skipped) return;

        if (ctx.method === "POST" && this.events.post) {
            this.events.post.run(ctx, domain, function (err) {
                if (err)
                    ctx.done(err, result);
            });
        }
        else if (ctx.method === "GET" && this.events.get) {
            this.events.get.run(ctx, domain, function (err) {
                if (err)
                    ctx.done(err, result);
            });
        }
        else if (ctx.method === "DELETE" && this.events.delete) {
            this.events.delete.run(ctx, domain, function (err) {
                if (err)
                    ctx.done(err, result);
            });
        }
        else if (ctx.method === "PUT" && this.events.put) {
            this.events.put.run(ctx, domain, function (err) {
                if (err)
                    ctx.done(err, result);
            });
        }
        else {
            next();
        }
    }.bind(this));


};
