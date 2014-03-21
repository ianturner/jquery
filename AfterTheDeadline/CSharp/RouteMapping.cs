// ********************************************************************************
// RouteMapping.cs
// ASP.Net MVC route mapping helper 
// 3rd April 2012
// Ian Turner (https://github.com/ianturner)
// see https://groups.google.com/forum/?hl=en#!forum/atd-developers
// ********************************************************************************

/// <summary>
/// Registers the routes for the application into the global RouteTable.Routes collection.
/// </summary>
/// <param name="routes">The RouteTable.Routes collection.</param>
public static void RegisterRoutes(RouteCollection routes)
{
    // [the usual IgnoreRoute statements]
    
    // [application's custom route mappings]

    // route to spell-checking proxy class
    string[] allowedMethods = { "GET", "POST" };
    HttpMethodConstraint methodConstraints = new HttpMethodConstraint(allowedMethods);
    routes.Add(
        new Route(
            "{name}/{*everythingelse}", 
            new RouteValueDictionary(), 
            new RouteValueDictionary(new { name = "CheckSpelling.Proxy", httpMethod = methodConstraints }), 
            new AtDProxyHandler()
        )
    );
    
    // ... finally, map default controller/action route, e.g.
    routes.MapRoute(
        "Default",                                              // Route name
        "{controller}/{action}/{id}",                           // URL with parameters
        new { controller = "Home", action = "Index", id = string.Empty }  // Parameter defaults
    );
}
