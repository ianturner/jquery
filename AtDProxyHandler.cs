// ********************************************************************************
// AtDProxyHandler.cs
// C# proxy class for ASP.Net MVC
// 3rd April 2012
// Ian Turner (https://github.com/ianturner)
// see https://groups.google.com/forum/?hl=en#!forum/atd-developers
//
// supporting <appSettings> using in this code...
//  <add key="AtDServer" value="http://127.0.0.1:1049" />
//  <add key="SpellCheckUrl" value="checkDocument" />
//  <add key="SpellCheckDataId" value="data" />
// ********************************************************************************

using System.Configuration;
using System.IO;
using System.Net;
using System.Web;
using System.Web.Routing;

namespace MyApplication.Helpers
{
    /// <summary>
    /// Definition of the AtDProxyHandler class that receives routing requests, as defined in Helpers.RouteMapping, 
    /// calls the AfterTheDeadline server and returns the result.
    /// </summary>
    public class AtDProxyHandler : IHttpHandler, IRouteHandler
    {
        #region Constructor
        
        /// <summary>
        /// Initializes a new instance of the AtDProxyHandler class.
        /// </summary>
        public AtDProxyHandler()
        {
            ProxiedUrl = string.Format(
                "{0}/{1}?{2}=", 
                ConfigurationManager.AppSettings["AtDServer"], 
                ConfigurationManager.AppSettings["SpellCheckUrl"],
                ConfigurationManager.AppSettings["SpellCheckDataId"]
            );
        }
        
        #endregion

        #region Properties

        /// <summary>
        /// Gets or sets the proxied URL that will be called by ProcessRequest.
        /// </summary>
        public string ProxiedUrl { get; set; }

        /// <summary>
        /// Gets a value indicating whether the handler IsReusable.
        /// </summary>
        public bool IsReusable
        {
            get { return true; }
        }

        #endregion

        /// <summary>
        /// Implements the ProcessRequest method required by IHttpHandler.
        /// </summary>
        /// <param name="context">The HttpContext wrapping the request.</param>
        public void ProcessRequest(HttpContext context)
        {
            // assemble a new HTTP request to the proxied URL
            string dataId = ConfigurationManager.AppSettings["SpellCheckDataId"].ToString();
            string data = context.Request.RequestType == "GET" ? context.Request.QueryString[dataId] : context.Request.Form[dataId];
            string requestStr = string.Format("{0}{1}", ProxiedUrl, data);
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(requestStr);
            request.Method = "GET";

            // get the response from the AtD server
            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            StreamReader reader = new StreamReader(response.GetResponseStream());

            // return the response, with appropriate encoding
            context.Response.ContentType = context.Request.ContentType == "application/x-www-form-urlencoded" ? "text/xml" : "text/css";
            context.Response.StatusCode = 200;
            string responseStr = reader.ReadToEnd();
            context.Response.Write(responseStr);
            context.Response.End();
        }

        /// <summary>
        /// Implements the GetHttpHandler method required by IHttpHandler.
        /// </summary>
        /// <param name="requestContext">The HttpContext wrapping the request.</param>
        /// <returns>A valid HttpHandler instance.</returns>
        public IHttpHandler GetHttpHandler(RequestContext requestContext)
        {
            return this;
        }
    }
}
