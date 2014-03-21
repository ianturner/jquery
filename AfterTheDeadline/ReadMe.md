Using AfterTheDeadline (Atd) with C# and jQuery

[After the Deadline](http://www.afterthedeadline.com) is an [open source](http://open.afterthedeadline.com/) software service that [checks spelling, style, and grammar](http://www.afterthedeadline.com/features.slp).

See https://github.com/Automattic/atd-jquery for the original AtD API and examples for using that in your web application.

This API extends the original, cleans and re-architects the jQuery plugin, and provides all the C# code you should nee to get it working in an ASP.Net MVC (v3) application.

Repo structure:

/script
    /jquery.atd-2.0.0.textarea.js           jQuery plugin for After The Deadline 
    
/CSharp
    /Default.aspx.cs                        ASP.Net MVC default page handler
    /RouteMapping.cs                        ASP.Net MVC route mapping helper 
    /AtDProxyHandler.cs                     C# proxy class for ASP.Net MVC

/Views
    /ContactMessageForm.ascx                ASP.Net MVC3 (NVelocity) view excerpt demonstrating AtD usage
