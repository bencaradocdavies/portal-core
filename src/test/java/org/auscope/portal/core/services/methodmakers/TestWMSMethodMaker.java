package org.auscope.portal.core.services.methodmakers;


import java.net.URISyntaxException;
import org.apache.http.client.methods.HttpRequestBase;
import org.auscope.portal.core.test.PortalTestClass;
import org.junit.Assert;
import org.junit.Test;

/**
 * Unit tests for WMSMethodMaker
 * @author Josh Vote
 *
 */
public class TestWMSMethodMaker extends PortalTestClass {

    /**
     * Tests that the basic parameters make it into every request
     * @throws URISyntaxException
     */
    @Test
    public void testParamParsing_NoParams() throws URISyntaxException {
        WMSMethodMaker mm = new WMSMethodMaker();
        HttpRequestBase getCapMethod = mm.getCapabilitiesMethod("http://example.com");
        HttpRequestBase getFeatureMethod = mm.getFeatureInfo("http://example.com", "format", "layer", "EPSG:4326", 1.0, 2.0, 3.0, 4.0, 100, 200, 6.0, 7.0, 20, 30, "styles",null);
        HttpRequestBase getMapMethod = mm.getMapMethod("http://example.com", "layer", "imageMimeType", "srs", 1.0, 2.0, 3.0, 4.0, 100, 200, "styles", "styleBody");
        HttpRequestBase getLegendMethod = mm.getLegendGraphic("http://example.com", "layerName", 100, 200, "styles");

        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("request=GetCapabilities"));

        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("request=GetFeatureInfo"));

        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("request=GetMap"));

        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("request=GetLegendGraphic"));
    }

    /**
     * Tests that additional parameters make it into every request
     * @throws URISyntaxException
     */
    @Test
    public void testParamParsing_ExtraParams() throws URISyntaxException {
        WMSMethodMaker mm = new WMSMethodMaker();
        HttpRequestBase getCapMethod = mm.getCapabilitiesMethod("http://example.com?param1=val1&param2=val2");
        HttpRequestBase getFeatureMethod = mm.getFeatureInfo("http://example.com?param1=val1&param2=val2", "format", "layer", "EPSG:4326", 1.0, 2.0, 3.0, 4.0, 100, 200, 6.0, 7.0, 20, 30, "styles",null);
        HttpRequestBase getMapMethod = mm.getMapMethod("http://example.com?param1=val1&param2=val2", "layer", "imageMimeType", "srs", 1.0, 2.0, 3.0, 4.0, 100, 200, "styles", "styleBody");
        HttpRequestBase getLegendMethod = mm.getLegendGraphic("http://example.com?param1=val1&param2=val2", "layerName", 100, 200, "styles");

        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("request=GetCapabilities"));
        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("param1=val1"));
        Assert.assertTrue(getCapMethod.getURI().getQuery().contains("param2=val2"));

        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("request=GetFeatureInfo"));
        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("param1=val1"));
        Assert.assertTrue(getFeatureMethod.getURI().getQuery().contains("param2=val2"));

        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("request=GetMap"));
        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("param1=val1"));
        Assert.assertTrue(getMapMethod.getURI().getQuery().contains("param2=val2"));

        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("service=WMS"));
        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("request=GetLegendGraphic"));
        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("param1=val1"));
        Assert.assertTrue(getLegendMethod.getURI().getQuery().contains("param2=val2"));
    }
}
