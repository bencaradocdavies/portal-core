package org.auscope.portal.core.server.controllers;


import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.conn.ConnectTimeoutException;
import org.apache.http.entity.StringEntity;
import org.auscope.portal.core.server.http.download.DownloadResponse;
import org.auscope.portal.core.services.PortalServiceException;
import org.auscope.portal.core.util.FileIOUtil;
import org.auscope.portal.core.view.JSONView;
import org.springframework.ui.ModelMap;
import org.springframework.web.servlet.ModelAndView;

/**
 * An abstract controller for providing portal 'standard' JSON response types
 * in the form of a ModelAndView object.
 *
 * Also contains a few utilities for common response types (eg: Zip Streams)
 *
 * @author Josh Vote
 *
 */
public abstract class BasePortalController {

    protected final Log log = LogFactory.getLog(getClass());

    public static final String OPERATION_FAILED = "The operation performed did not complete successfully.";
    public static final String FILTER_FAILED = "An error occurred when performing this query.";
    public static final String NO_RESULTS = "No results matched your query.";
    public static final String UNKNOWN_HOST_OR_FAILED_CONNECTION = "The service you wish to query can not be reached. ";
    public static final String OPERATION_TIMOUT = "The service is taking too long to respond.";
    public static final String GET_PROVIDERS_FAILED = "An error occurred when getting the list of data providers.";

    /**
     * Utility method generating the 'standard' Portal response model.
     *
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @param debugInfo [Optional] Debugging Information. Can be null, must be serialisable into a JSON object
     * @param matchedResults [Optional] The number of results available (not necessarily the count of data)
     * @return
     */
    protected ModelMap generateResponseModel(boolean success, Object data, Integer matchedResults, String message, Object debugInfo) {
        ModelMap model = new ModelMap();

        model.put("data", data);
        model.put("success", success);
        if (matchedResults != null) {
            model.put("totalResults", matchedResults);
        }
        model.put("msg", message);
        if (debugInfo != null) {
            model.put("debugInfo", debugInfo);
        }

        return model;
    }

    /**
     * Utility method to generate a standard ModelAndView response for rendering JSON
     * @param success The result of the operation
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success) {
        return generateJSONResponseMAV(success, null, "", null, null);
    }

    /**
     * Utility method to generate a standard ModelAndView response for rendering JSON
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success, Object data, String message) {
        return generateJSONResponseMAV(success, data, message, null, null);
    }

    /**
     * Utility method to generate a standard ModelAndView response for rendering JSON
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @param matchedResults [Optional] The total amount of data available (not necessarily the count of data)
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success, Object data, Integer matchedResults, String message) {
        return generateJSONResponseMAV(success, data, message, matchedResults, null);
    }

    /**
     * Utility method to generate a standard ModelAndView response for rendering JSON
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @param debugInfo [Optional] Debugging Information. Can be null, must be serialisable into a JSON object
     * @param matchedResults [Optional] The total amount of data available (not necessarily the count of data)
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success, Object data, String message, Object debugInfo) {
        return generateJSONResponseMAV(success, data, message, null, debugInfo);
    }

    /**
     * Generates a JSON response containing WFS response info
     * @param success The result of the operation
     * @param gml The raw GML response
     * @param kml The transformed KML response
     * @param method The method used to make the request (used for populating debug info)
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success, String gml, String kml, HttpRequestBase method) {

        if (kml == null || kml.isEmpty()) {
            log.error("Transform failed");
            log.trace(gml);
            return generateJSONResponseMAV(false, null, OPERATION_FAILED);
        }

        ModelMap data = new ModelMap();

        data.put("gml", gml);
        data.put("kml", kml);

        ModelMap debug = makeDebugInfoModel(method);

        return generateJSONResponseMAV(success, data, "", debug);
    }

    /**
     * Utility method to generate a standard ModelAndView response for rendering JSON
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @param debugInfo [Optional] Debugging Information. Can be null, must be serialisable into a JSON object
     * @param matchedResults [Optional] The total amount of data available (not necessarily the count of data)
     * @return
     */
    protected ModelAndView generateJSONResponseMAV(boolean success, Object data, String message, Integer matchedResults, Object debugInfo) {
        JSONView view = new JSONView();
        ModelMap model = generateResponseModel(success, data, matchedResults, message, debugInfo);

        return new ModelAndView(view, model);
    }

    /**
     * Utility method to generate a HTML MAV response. This will be identical in content to generateJSONResponseMAV but
     * will be set to use a HTML content type. Use this for overcoming weirdness with Ext JS and file uploads.
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @return
     */
    protected ModelAndView generateHTMLResponseMAV(boolean success, Object data, String message) {
        return generateHTMLResponseMAV(success, data, message, null);
    }

    /**
     * Utility method to generate a HTML MAV response. This will be identical in content to generateJSONResponseMAV but
     * will be set to use a HTML content type. Use this for overcoming weirdness with Ext JS and file uploads.
     * @param success The result of the operation
     * @param data [Optional] Raw response information. Can be null, must be serialisable into a JSON object.
     * @param message [Optional] A string indicating more information about status of information
     * @param debugInfo [Optional] Debugging Information. Can be null, must be serialisable into a JSON object
     * @return
     */
    protected ModelAndView generateHTMLResponseMAV(boolean success, Object data, String message, Object debugInfo) {
        JSONView view = new JSONView();
        view.setContentType("text/html");
        ModelMap model = generateResponseModel(success, data, null, message, debugInfo);

        return new ModelAndView(view, model);
    }

    /**
     * Turns a HttpRequest into a Map of
     * url - the URI of request
     * info - [Optional] The body of the request if relevant (for POST)
     * @param request cannot be null
     * @return
     */
    protected ModelMap makeDebugInfoModel(HttpRequestBase request) {
        if (request == null) {
            return null;
        }

        ModelMap debugInfo = new ModelMap();
        try {
            debugInfo.put("url", request.getURI().toString());
        } catch (Exception e) {
            log.debug("Unable to generate URI from request", e);
            debugInfo.put("url", String.format("Error Generating URI - %1$s", e.getMessage()));
        }
        if (request instanceof HttpPost) {
            HttpEntity entity = ((HttpPost) request).getEntity();
            if (entity instanceof StringEntity) {
                try {
                    debugInfo.put("info", ((StringEntity) entity).getContent());
                } catch (IOException e) {
                   log.error(e.toString());
                }
            }
        }

        return debugInfo;
    }


    /**
     * Exception resolver that maps exceptions to views presented to the user.
     * @param e The exception
     * @param serviceUrl The Url of the actual service
     * @return ModelAndView object with error message
     */
    protected ModelAndView generateExceptionResponse(Throwable e, String serviceUrl) {
        return generateExceptionResponse(e, serviceUrl, null);
    }

    /**
     * Exception resolver that maps exceptions to views presented to the user.
     * @param e The exception
     * @param serviceUrl The Url of the actual service
     * @param request [Optional] Specify the request object that was used to make the HTTP WFS request. Its contents will be included for debug purposes
     * @return ModelAndView object with error message
     */
    protected ModelAndView generateExceptionResponse(Throwable e, String serviceUrl, HttpRequestBase request) {
        log.debug(String.format("Exception! serviceUrl='%1$s'", serviceUrl), e);

        //Portal service exceptions wrap existing exceptions with a culprit HttpMethodBase
        if (e instanceof PortalServiceException) {
            PortalServiceException portalServiceEx = (PortalServiceException) e;
            return generateExceptionResponse(portalServiceEx.getCause(), serviceUrl, portalServiceEx.getRootMethod());
        }

        // Service down or host down
        if (e instanceof ConnectException || e instanceof UnknownHostException) {
            return this.generateJSONResponseMAV(false, null, UNKNOWN_HOST_OR_FAILED_CONNECTION, makeDebugInfoModel(request));
        }

        // Timeouts
        if (e instanceof ConnectTimeoutException) {
            return this.generateJSONResponseMAV(false, null, OPERATION_TIMOUT, makeDebugInfoModel(request));
        }

        if (e instanceof SocketTimeoutException) {
            return this.generateJSONResponseMAV(false, null, OPERATION_TIMOUT, makeDebugInfoModel(request));
        }

        // An error we don't specifically handle or expect
        return this.generateJSONResponseMAV(false, null, FILTER_FAILED, makeDebugInfoModel(request));
    }
}
