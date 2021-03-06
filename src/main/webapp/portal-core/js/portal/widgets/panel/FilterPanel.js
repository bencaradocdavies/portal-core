/**
 * A panel for displaying filter forms for a given portal.layer.Layer
 *
 * A filter panel is coupled tightly with a portal.widgets.panel.LayerPanel
 * as it is in charge of displayed appropriate filter forms matching the current
 * selection
 *
 * Events : filterselectioncomplete : trigger when the user have finished filter selection.
 *
 */
Ext.define('portal.widgets.panel.FilterPanel', {
    extend: 'Ext.Panel',

    /**
     * Easy reference to the 'Apply Filter' button
     */
    _filterButton : null,

    /**
     * Easy reference to the 'Reset' button
     */
    _resetButton : null,

    /**
     * Reference to the layer panel
     */
    _layerPanel : null,

    /**
     * Accepts all parameters for a normal Ext.Panel instance with the following additions
     * {
     *  layerPanel : [Required] an instance of a portal.widgets.panel.LayerPanel - selection events will be listend for
     * }
     */
    constructor : function(config) {
        this._layerPanel = config.layerPanel;
        this._map = config.map;
        this.addEvents('filterselectioncomplete');
        var emptyCard = Ext.create('portal.layer.filterer.forms.EmptyFilterForm', {}); //show this
        this._filterButton = Ext.create('Ext.button.Button', {
            text :'Add to Map',
            disabled : false,
            overCls : 'showResultsOverStyle',
            handler : Ext.bind(this._onApplyFilter, this)
        });

        this._resetButton = Ext.create('Ext.button.Button', {
            text :'Reset Filter',
            iconCls:'refresh',
            disabled : false,
            handler : Ext.bind(this._onResetFilter, this)
        });

        Ext.apply(config, {
            layout : 'card',
            buttonAlign : 'right',
            items : [emptyCard],
            bbar: [ this._filterButton, '->', this._resetButton ]
        });

        this.callParent(arguments);

        this._layerPanel.on('select', this._onLayerPanelSelect, this);


    },

    _onLayerPanelSelect : function(sm, layer, index) {
        this.showFilterForLayer(layer);
    },

    /**
     * Internal handler for when the user clicks 'Apply Filter'.
     *
     * Simply updates the appropriate layer filterer. It's the responsibility
     * of renderers/layers to listen for filterer updates.
     */
    _onApplyFilter : function() {
        this.fireEvent('filterselectioncomplete');

        var baseFilterForm = this.getLayout().getActiveItem();
        var filterer = baseFilterForm.layer.get('filterer');

        //Before applying filter, update the spatial bounds (silently)
        filterer.setSpatialParam(this._map.getVisibleMapBounds(), true);

        baseFilterForm.writeToFilterer(filterer);
    },

    /**
     * Internal handler for when the user clicks 'Reset Filter'.
     *
     * Using the reset method from Ext.form.Basic. All fields in
     * the form will be reset. However, any record bound by loadRecord
     * will be retained.
     */
    _onResetFilter : function() {
        var baseFilterForm = this.getLayout().getActiveItem();
        baseFilterForm.getForm().reset();
    },

    /**
     * Given an instance of portal.layer.Layer - update the displayed panel
     * with an appropriate filter form (as defined by portal.layer.filterer.FormFactory).
     */
    showFilterForLayer : function(layer) {
        var layout = this.getLayout();
        var filterForm = layer ? layer.get('filterForm') : null;
        var renderOnAdd = layer ? layer.get('renderOnAdd') : false;

        //Load the form (by either switching to it or adding it)
        if (filterForm) {
            if (!layout.setActiveItem(filterForm)) {
                //Now this will return false when activating the current card
                //or activating a form that DNE. We can eliminate the first
                //problem with a simple ID check
                if (layout.getActiveItem().id !== filterForm.id) {
                    //So now we can be sure the setting failed because it's the first
                    //time this form has been added to this panel
                    this.add(filterForm);
                    layout.setActiveItem(filterForm);
                }
            }
        } else {
            layout.setActiveItem(this._emptyCard);
        }

        //Activate the filter and reset buttons (if appropriate)
        disableButtons = renderOnAdd || !filterForm;
        //false to enable, true to disable

        this._filterButton.getEl().addCls("applyFilterCls");
        this._filterButton.getEl().frame();


    },

    clearFilter : function(){
        var layout = this.getLayout();

        //Remove custom CSS styles for filter button
        //this._filterButton.getEl().removeCls("applyFilterCls");

        //Disable the filter and reset buttons (set to default values)
        //this._filterButton.setDisabled(true);
        this._resetButton.setDisabled(true);

        //Close active item to prevent memory leak
        var actvItem = layout.getActiveItem();
        if (actvItem) {
            actvItem.close();
        }
        layout.setActiveItem(this._emptyCard);
    }
});