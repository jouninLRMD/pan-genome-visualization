import {updateTips,updateBranches} from "../phyloTree/src/updateTree";
import {panXTree} from "./global";
import {colorPresenceAbsence,styleGainLoss} from "./tree-init";
import {assign_metadata_color,metaColor_dicts,metaColor_dicts_keys,metaColor_reference_dicts} from './meta-color-assignment';
import {preOrderIteration} from "../phyloTree/src/treeHelpers";

//## legend configuration
var legendRectSize = 15,
    legendSpacing = 4;

//## clean legend
export const removeLegend = function(coreTree_legend_id) {
    var legend= d3.select('#'+coreTree_legend_id);
    legend.selectAll('.legend')
        .remove();
}

const metaUnknown=panXTree.metaUnknown,
      strokeToFill = panXTree.strokeToFill;
//## create legend
const makeLegend = function(metaType,speciesTree,geneTree,coreTree_legend_id){ // && legendOptionValue!= "Meta-info"
    console.log(metaType);
    if (metaType==="genePattern"){
        var node,strain, fill;
        for (var i=0; i<speciesTree.tips.length; i++){
            node = speciesTree.tips[i];
            node.tipAttributes.r = node.genePresent?5:3;
            fill = node.genePresent?panXTree.genePresentFill:panXTree.geneAbsentFill
            node.tipAttributes.fill = fill;
            node.tipAttributes.stroke = d3.rgb(fill).darker(strokeToFill).toString();
        }
        colorPresenceAbsence(speciesTree);
        styleGainLoss(speciesTree);
        for (var i=0; i<geneTree.tips.length; i++){
            node = geneTree.tips[i];
            strain = speciesTree.namesToTips[node.n.accession];
            node.tipAttributes.fill = "#AAA";
            node.tipAttributes.stroke = d3.rgb(node.tipAttributes.fill).darker(strokeToFill).toString();
        }
        updateTips(geneTree, [], ["fill", "stroke"], 0);

    }
    else if (metaType!='') {
        var itemCount = {};
        for (var i=0; i<speciesTree.tips.length; i++){
            const node = speciesTree.tips[i];
            if (itemCount[node.n.attr[metaType]]){
                itemCount[node.n.attr[metaType]]++;
            }else{
                itemCount[node.n.attr[metaType]]=1;
            }
            if (meta_display['color_options'][metaType]['type']=='discrete'){
                const fill=metaColor_dicts[metaType][node.n.attr[metaType]];
                node.tipAttributes.fill = fill || metaUnknown;
                node.branchAttributes["stroke"] = fill || metaUnknown;
            }else{//** continuous
                const lengend_value= metaColor_reference_dicts[metaType][node.n.attr[metaType]],
                      fill= metaColor_dicts[metaType][lengend_value];
                node.tipAttributes.fill = fill|| metaUnknown;
                node.branchAttributes["stroke"] = fill || metaUnknown;
            }
            node.tipAttributes.stroke = d3.rgb(node.tipAttributes.fill).darker(strokeToFill).toString();
        }

        for (var i=0; i<geneTree.tips.length; i++){
            const node = geneTree.tips[i];
            const strain = speciesTree.namesToTips[node.n.accession];
            if(meta_display['color_options'][metaType]['type']=='discrete'){
                const fill= metaColor_dicts[metaType][strain.n.attr[metaType]];
                node.tipAttributes.fill = fill || metaUnknown;
            }else{//** continuous
                const lengend_value= metaColor_reference_dicts[metaType][strain.n.attr[metaType]];
                      fill =metaColor_dicts[metaType][lengend_value];
                node.tipAttributes.fill = fill || metaUnknown;
            }
            node.tipAttributes.stroke = d3.rgb(node.tipAttributes.fill).darker(strokeToFill).toString();
        }

        //** assign internal branch color
        for (var i=0; i<speciesTree.internals.length; i++){
            const inner_node = speciesTree.internals[i];
            var color_compare='',consistent_flag=0,fill;
            preOrderIteration(inner_node, function(d){if (d.terminal){
                if (color_compare==''){ fill=d.tipAttributes.fill}
                if (color_compare!==d.tipAttributes.fill) {consistent_flag+=1}
                color_compare=d.tipAttributes.fill;}
            });
            if (consistent_flag==1) {
                inner_node.branchAttributes["stroke"] = fill|| metaUnknown;
            }else{
                //** use gene event color for internal branch color
                //inner_node.branchAttributes["stroke"] = inner_node.branchAttributes['event_pattern'];
                inner_node.branchAttributes["stroke"] = panXTree.branchStroke_default;
            }

        }


        updateTips(geneTree, [], ["fill", "stroke"], 0);
        updateTips(speciesTree, [], ["fill", "stroke"], 0);
        updateBranches(speciesTree, [], ["stroke"], 0);

        var legend= d3.select('#'+coreTree_legend_id)
            .attr('width', panXTree.legend_width)
            .attr('height', panXTree.legend_height);
        var tmp_leg = legend.selectAll(".legend")
            .data( metaColor_dicts_keys[metaType] )
            .enter().append('g')
            .attr('class', 'legend')
            .attr('transform', function(d, i) {
                var stack = 20;
                var height = legendRectSize + legendSpacing;
                var fromRight = Math.floor(i / stack);
                var fromTop = i % stack;
                var horz = fromRight * 145 + 5;
                var vert = fromTop * height + 5;
                return 'translate(' + horz + ',' + vert + ')';
            });

        const meta_coloring_type= meta_display['color_options'][metaType]['type'];
        const mouseover_legend = function(metaField, tree){
            tree.tipElements
            .filter(function(d){
                    if (meta_coloring_type=='discrete'&&d.n.attr[metaType] == metaField){
                        return true;
                    } else if (meta_coloring_type!='discrete'&&((metaColor_reference_dicts[metaType]!== undefined)&&(metaColor_reference_dicts[metaType][d.n.attr[metaType]] == metaField))){
                        return true;
                    }
                    //** avoid over-selecting problem in mixed_continuous log_scale
                    //** { 2.00: "1.00", 4.00: "2.00"}
                    //** when mousehovering 2.00: nodes with 2.00 and 4.00 are selected in previous code
            })
            .attr('r',function(d){return d.tipAttributes.r*2;})
            .style('fill', function(d){return d3.rgb(d.tipAttributes.fill).brighter(strokeToFill);});
        }

        const mouseout_legend = function(metaField, tree){
            tree.tipElements
                .attr('r', function(d){return d.tipAttributes.r;})
                .style('fill', function(d){return d.tipAttributes.fill;});
        }

        tmp_leg.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .attr('text', function (d) {return d;} )
            .attr('fill', function (d) {
                var col = metaColor_dicts[metaType][d];
                return d3.rgb(col).toString();
            })
            .attr('stroke', function (d) {
                var col = metaColor_dicts[metaType][d];
                return d3.rgb(col).darker([0.4]).toString();
            })
            .on("mouseover", function(d) {mouseover_legend(d,speciesTree)})
            .on("mouseout",  function(d) {mouseout_legend(d,speciesTree)});

        tmp_leg.append('text')
            .attr('x', legendRectSize + legendSpacing + 5)
            .attr('y', legendRectSize - legendSpacing)
            .attr('text', function (d) {return d;} )
            .text(function(d) {
                return d.toString();
            })
            .on("mouseover", function(d) {mouseover_legend(d,speciesTree)})
            .on("mouseout",  function(d) {mouseout_legend(d,speciesTree)});

        return tmp_leg;
    }
}

//## update legend and coloring nodes by meta-info
export const updateMetadata = function(metaType,speciesTree,geneTree,meta_display,coreTree_legend_id,tool_side) {
    removeLegend(coreTree_legend_id);
    makeLegend(metaType,speciesTree,geneTree,coreTree_legend_id, tool_side);
};

//## creat dropdown-list for meta-info
export const create_dropdown = function (div, speciesTree, geneTree, meta_display,coreTree_legend_id, tool_side) {
    const meta_display_order=meta_display['meta_display_order'];
    var menu_panel = d3.select(div)

    var dropdown_meta = menu_panel
        .append("select")
        .attr("id","dropdown_select")
        .attr("class","form-control sm-customized")

    dropdown_meta.append("option")
        .attr("value", "Meta-info")
        .attr("selected", 1)
        .text("Meta-info");

    dropdown_meta.append("option")
        .attr("value", "genePattern")
        .text("gene presence/absence");

    for (var i = 0, len = meta_display_order.length; i < len; i++) {
        const metaType= meta_display_order[i];
        if (meta_display['color_options'][metaType]['display']==undefined || meta_display['color_options'][metaType]['display']!='no'){
            dropdown_meta.append("option")
                .attr("value", metaType)
                .text(metaType);
        }
    }
}
