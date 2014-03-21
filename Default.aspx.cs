// ********************************************************************************
// Default.aspx.cs
// ASP.Net MVC default page handler
// 3rd April 2012
// Ian Turner (https://github.com/ianturner)
// see https://groups.google.com/forum/?hl=en#!forum/atd-developers
// ********************************************************************************

using System.Web;
using System.Web.Mvc;
using System.Web.UI;

namespace MyApplication
{
    /// <summary>
    /// ASP.Net default page handler.
    /// </summary>
    public partial class _Default : Page
    {
        /// <summary>
        /// Page_Load event handler.
        /// </summary>
        /// <param name="sender">The source object.</param>
        /// <param name="e">Event arguments.</param>
        public void Page_Load(object sender, System.EventArgs e)
        {
            /* Change the current path so that the Routing handler can correctly interpret
             * the request, then restore the original path so that the OutputCache module
             * can correctly process the response (if caching is enabled). */
            string originalPath = Request.Path;
            HttpContext.Current.RewritePath(Request.ApplicationPath, false);
            IHttpHandler httpHandler = new MvcHttpHandler();
            httpHandler.ProcessRequest(HttpContext.Current);
            HttpContext.Current.RewritePath(originalPath, false);
        }
    }
}
