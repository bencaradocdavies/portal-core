/**
 * An abstract base class to be extended.
 *
 * Represents a grid panel for containing layers
 * that haven't yet been added to the map. Each row
 * will be grouped under a heading, contain links
 * to underlying data sources and have a spatial location
 * that can be viewed by the end user.
 *
 * This class is expected to be extended for usage within
 * the 'Registered Layers', 'Known Layers' and 'Custom Layers'
 * panels in the portal. Support for KnownLayers/CSWRecords and
 * other row types will be injected by implementing the abstract
 * functions of this class
 *
 * Adds the following events :
 *      addlayerrequest(this, Ext.data.Model) - raised whenever the user has indicated to this panel that it wishes
 *                                              to add a specified record to the map as a new layer
 */
Ext.define('portal.widgets.panel.BaseRecordPanel', {
    extend : 'Ext.grid.Panel',
    alias: 'widget.baserecordpanel',
    browseCatalogueDNSMessage : false, //VT: Flags the do not show message when browse catalogue is clicked.
    map : null,

    constructor : function(cfg) {
        var me = this;
        this.map = cfg.map;

        var groupingFeature = Ext.create('Ext.grid.feature.Grouping',{
            groupHeaderTpl: '{name} ({[values.rows.length]} {[values.rows.length > 1 ? "Items" : "Item"]})'
        });

        this.addEvents('addlayerrequest');
        this.listeners = cfg.listeners;

        Ext.apply(cfg, {
            hideHeaders : true,
            features : [groupingFeature],
            viewConfig : {
                emptyText : '<p class="centeredlabel">No records match the current filter.</p>'
            },
            dockedItems : [{
                xtype : 'toolbar',
                dock : 'top',
                portalName : 'search-bar', //used for distinguishing this toolbar
                items : [{
                    xtype : 'label',
                    text : 'Search: '
                },{
                    xtype : 'clientsearchfield',
                    width : 200,
                    fieldName: 'name',
                    store : cfg.store
                },{
                    xtype : 'button',
                    text : 'Visible',
                    tooltip: 'Filter the layers based on its bounding box and the map\'s visible bound',
                    handler : Ext.bind(this._handleVisibleFilterClick, this)
                }]
            }],
            columns : [{
                //Title column
                text : 'Title',
                dataIndex : 'name',
                flex: 1,
                renderer : this._titleRenderer
            },{
                //Service information column
                xtype : 'clickcolumn',
                dataIndex : 'serviceInformation',
                width: 32,
                renderer : this._serviceInformationRenderer,
                hasTip : true,
                tipRenderer : function(value, layer, column, tip) {
                    return 'Click for detailed information about the web services this layer utilises.';
                },
                listeners : {
                    columnclick : Ext.bind(this._serviceInformationClickHandler, this)
                }
            },{
                //Spatial bounds column
                xtype : 'clickcolumn',
                dataIndex : 'spatialBoundsRenderer',
                width: 32,
                renderer : this._spatialBoundsRenderer,
                hasTip : true,
                tipRenderer : function(value, layer, column, tip) {
                    return 'Click to see the bounds of this layer, double click to pan the map to those bounds.';
                },
                listeners : {
                    columnclick : Ext.bind(this._spatialBoundsClickHandler, this),
                    columndblclick : Ext.bind(this._spatialBoundsDoubleClickHandler, this)
                }
            }],
            plugins: [{
                ptype: 'rowexpander',
                rowBodyTpl : [
                    '<p>{description}</p><br>'
                ]
            },{
                ptype: 'celltips'
            }],
            buttonAlign : 'right',
            bbar: [{
                text:'Add Layer to Map',
                tooltip:'Add Layer to Map',
                hidden : true,
                iconCls:'add',
                handler: function(btn) {
                    var grid = btn.findParentByType('baserecordpanel');
                    var sm = grid.getSelectionModel();
                    var selectedRecords = sm.getSelection();
                    if (selectedRecords && selectedRecords.length > 0) {
                        grid.fireEvent('addlayerrequest', this, selectedRecords[0]); //we only support single selection
                    }
                }
            },{
                xtype: 'tbfill'
            },{

                text:'Browse Catalogue',
                itemId: 'browseCatalogue',
                tooltip:'Browse and filter through the available catalogue',
                iconCls:'magglass',
                hidden:true,
                scope:this,
                handler: function(btn) {
                    //VT: TODO use BrowserWindowWithWarning.js
                    if(me.browseCatalogueDNSMessage==true){
                        var cswFilterWindow = new portal.widgets.window.CSWFilterWindow({
                            name : 'CSW Filter',
                            listeners : {
                                filterselectcomplete : Ext.bind(this.handleFilterSelectComplete, this)
                            }
                        });
                        cswFilterWindow.show();
                    }else{
                        Ext.MessageBox.show({
                            title:    'Browse Catalogue',
                            msg:      'Select the filters across the tabs and once you are happy with the result, click on OK to apply all the filters<br><br><input type="checkbox" id="do_not_show_again" value="true" checked/>Do not show this message again',
                            buttons:  Ext.MessageBox.OK,
                            scope : this,
                            fn: function(btn) {
                                if( btn == 'ok') {
                                    if (Ext.get('do_not_show_again').dom.checked == true){
                                        me.browseCatalogueDNSMessage=true;
                                    }
                                    var cswFilterWindow = new portal.widgets.window.CSWFilterWindow({
                                        name : 'CSW Filter',
                                        listeners : {
                                            filterselectcomplete : Ext.bind(this.handleFilterSelectComplete, this)
                                        }
                                    });
                                    cswFilterWindow.show();
                                }
                            }
                        });
                    }

                }

            }]
        });

        this.callParent(arguments);
    },

    /**
     * returns true if selection is found on the layer and false if not.
     */
    addSelectedLayerToActive : function (){
        var grid = this;
        var sm = grid.getSelectionModel();
        var selectedRecords = sm.getSelection();
        if (selectedRecords && selectedRecords.length > 0) {
            selectedRecords[0].get('layer').set('displayed',true);
            grid.fireEvent('addlayerrequest', this, selectedRecords[0]); //we only support single selection
            return true;
        }else{
            return false;
        }
    },

    handleFilterSelectComplete : function(filteredResultPanels){
        var me = this;
        var cswSelectionWindow = new CSWSelectionWindow({
            title : 'CSW Record Selection',
            resultpanels : filteredResultPanels,
            listeners : {
                selectioncomplete : function(csws){
                    me.fireEvent('addlayerrequest', me, csws);
                }
            }
        });
        cswSelectionWindow.show();


        //
    },

    //-------- Abstract methods requiring implementation ---------

    /**
     * Abstract function - Should return a string based title
     * for a given record
     *
     * function(Ext.data.Model record)
     *
     * record - The record whose title should be extracted
     */
    getTitleForRecord : portal.util.UnimplementedFunction,

    /**
     * Abstract function - Should return an Array of portal.csw.OnlineResource
     * objects that make up the specified record. If no online resources exist
     * then an empty array can be returned
     *
     * function(Ext.data.Model record)
     *
     * record - The record whose underlying online resources should be extracted.
     */
    getOnlineResourcesForRecord : portal.util.UnimplementedFunction,

    /**
     * Abstract function - Should return an Array of portal.util.BBox
     * objects that represent the total spatial bounds of the record. If no
     * bounds exist then an empty array can be returned
     *
     * function(Ext.data.Model record)
     *
     * record - The record whose spatial bounds should be extracted.
     */
    getSpatialBoundsForRecord : portal.util.UnimplementedFunction,

    /**
     * Abstract function - Should return an Array of portal.csw.CSWRecord
     * objects that make up the specified record.
     *
     * function(Ext.data.Model record)
     *
     * record - The record whose underlying CSWRecords should be extracted.
     */
    getCSWRecordsForRecord : portal.util.UnimplementedFunction,

    //--------- Class Methods ---------

    /**
     * Generates an Ext.DomHelper.markup for the specified imageUrl
     * for usage as an image icon within this grid.
     */
    _generateHTMLIconMarkup : function(imageUrl) {
        return Ext.DomHelper.markup({
            tag : 'div',
            style : 'text-align:center;',
            children : [{
                tag : 'img',
                width : 16,
                height : 16,
                align: 'CENTER',
                src: imageUrl
            }]
        });
    },

    /**
     * Internal method, acts as an ExtJS 4 column renderer function for rendering
     * the title of the record.
     *
     * http://docs.sencha.com/ext-js/4-0/#!/api/Ext.grid.column.Column-cfg-renderer
     */
    _titleRenderer : function(value, metaData, record, row, col, store, gridView) {
        return this.getTitleForRecord(record);
    },

    /**
     * Internal method, acts as an ExtJS 4 column renderer function for rendering
     * the service information of the record.
     *
     * http://docs.sencha.com/ext-js/4-0/#!/api/Ext.grid.column.Column-cfg-renderer
     */
    _serviceInformationRenderer : function(value, metaData, record, row, col, store, gridView) {
        var onlineResources = this.getOnlineResourcesForRecord(record);

        var containsDataService = false;
        var containsImageService = false;

        //We classify resources as being data or image sources.
        for (var i = 0; i < onlineResources.length; i++) {
            switch(onlineResources[i].get('type')) {
            case portal.csw.OnlineResource.WFS:
            case portal.csw.OnlineResource.WCS:
            case portal.csw.OnlineResource.SOS:
            case portal.csw.OnlineResource.OPeNDAP:
            case portal.csw.OnlineResource.CSWService:
            case portal.csw.OnlineResource.IRIS:
                containsDataService = true;
                break;
            case portal.csw.OnlineResource.WMS:
            case portal.csw.OnlineResource.WWW:
            case portal.csw.OnlineResource.FTP:
            case portal.csw.OnlineResource.CSW:
            case portal.csw.OnlineResource.UNSUPPORTED:
                containsImageService = true;
                break;
            }
        }

        var iconPath = null;
        if (containsDataService) {
            iconPath = 'img/binary.png'; //a single data service will label the entire layer as a data layer
        } else if (containsImageService) {
            iconPath = 'img/picture.png';
        } else {
            iconPath = 'img/cross.png';
        }

        return this._generateHTMLIconMarkup(iconPath);
    },

    /**
     * Internal method, acts as an ExtJS 4 column renderer function for rendering
     * the spatial bounds column of the record.
     *
     * http://docs.sencha.com/ext-js/4-0/#!/api/Ext.grid.column.Column-cfg-renderer
     */
    _spatialBoundsRenderer : function(value, metaData, record, row, col, store, gridView) {
        var spatialBounds = this.getSpatialBoundsForRecord(record);
        if (spatialBounds.length > 0 || record.internalId == 'portal-InSar-reports') {
            // create one for insar
            return this._generateHTMLIconMarkup('img/magglass.gif');
        }

        return '';
    },

    /**
     * Show a popup containing info about the services that 'power' this layer
     */
    _serviceInformationClickHandler : function(column, record, rowIndex, colIndex) {
        var cswRecords = this.getCSWRecordsForRecord(record);
        if (!cswRecords || cswRecords.length === 0) {
            return;
        }

        var popup = Ext.create('portal.widgets.window.CSWRecordDescriptionWindow', {
            cswRecords : cswRecords
        });

        popup.show();
    },


    /**
     * On single click, show a highlight of all BBoxes
     */
    _spatialBoundsClickHandler : function(column, record, rowIndex, colIndex) {
        var spatialBoundsArray;
        if (record.internalId == 'portal-InSar-reports') {
            spatialBoundsArray = this.getWholeGlobeBounds();
        } else {
            spatialBoundsArray = this.getSpatialBoundsForRecord(record);
        }
        var nonPointBounds = [];

        //No point showing a highlight for bboxes that are points
        for (var i = 0; i < spatialBoundsArray.length; i++) {
            var bbox = spatialBoundsArray[i];
            if (bbox.southBoundLatitude !== bbox.northBoundLatitude ||
                bbox.eastBoundLongitude !== bbox.westBoundLongitude) {

                //VT: Google map uses EPSG:3857 and its maximum latitude is only 85 degrees
                // anything more will stretch the transformation
                if(bbox.northBoundLatitude>85){
                    bbox.northBoundLatitude=85;
                }
                if(bbox.southBoundLatitude<-85){
                    bbox.southBoundLatitude=-85;
                }
                nonPointBounds.push(bbox);
            }
        }

        this.map.highlightBounds(nonPointBounds);
    },

    /**
     * Return the max bbox for insar layer as it is a dummy CSW.
     */
    getWholeGlobeBounds : function() {
        var bbox = new Array();
        bbox[0] = Ext.create('portal.util.BBox', {
            northBoundLatitude : 85,
            southBoundLatitude : -85,
            eastBoundLongitude : 180,
            westBoundLongitude : -180
        });
        return bbox;
    },

    /**
     * On double click, move the map so that specified bounds are visible
     */
    _spatialBoundsDoubleClickHandler : function(column, record, rowIndex, colIndex) {
        var spatialBoundsArray;
        if (record.internalId == 'portal-InSar-reports') {
            spatialBoundsArray = this.getWholeGlobeBounds();
        } else {
            spatialBoundsArray = this.getSpatialBoundsForRecord(record);
        }

        if (spatialBoundsArray.length > 0) {
            var superBBox = spatialBoundsArray[0];

            for (var i = 1; i < spatialBoundsArray.length; i++) {
                superBBox = superBBox.combine(spatialBoundsArray[i]);
            }

            this.map.scrollToBounds(superBBox);
        }
    },

    /**
     * When the visible fn is clicked, ensure only the visible records pass the filter
     */
    _handleVisibleFilterClick : function(button) {
        var currentBounds = this.map.getVisibleMapBounds();

        //Function for testing intersection of a records's spatial bounds
        //against the current visible bounds
        var filterFn = function(rec) {
            var spatialBounds;
            spatialBounds = this.getSpatialBoundsForRecord(rec);
            for (var i = 0; i < spatialBounds.length; i++) {
                if (spatialBounds[i].intersects(currentBounds)) {
                    return true;
                }
            }

            return false;
        };

        var searchField = button.ownerCt.items.getAt(1);
        searchField.runCustomFilter('<visible layers>', Ext.bind(filterFn, this));
    },

    /**
     * When called, will update the visibility of any search bars
     */
    _updateSearchBar : function(visible) {
        var dockedItems = this.getDockedItems();
        var searchBar = null;
        for (var i = 0; i < dockedItems.length; i++) {
            if (dockedItems[i].initialConfig.portalName === 'search-bar') {
                searchBar = dockedItems[i];
            }
        }
        if (!searchBar) {
            return;
        }

        if (visible) {
            searchBar.show();
        } else {
            searchBar.hide();
        }
    },

    _personalTabActive:function(active){
        var dockedItems = this.getDockedItems();
        var personalBar = null;
        for (var i = 0; i < dockedItems.length; i++) {
            if (dockedItems[i].initialConfig.dock === 'bottom') {
                personalBar = dockedItems[i];
            }
        }

        var customize= personalBar.getComponent('browseCatalogue')

        if(active){
            customize.show();
        }else{
            customize.hide();
        }
    }

});