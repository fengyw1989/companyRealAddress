(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global.JusTree = factory());
}(this, (function() {

    function JusTree(params) {
        height = this.height = params.height ? params.height : 500;
        width = this.width = params.width ? params.width : 1000;
        this.wrapper = params.id ? params.id : 'body';
        this.data = params.data ? params.data : {};
        this.colors = ['#3898f1', '#42cb5e', '#fd700a'];
        this.svgDom = null;
        this.flag = true;
        this.root = null;
        this.g = null;
        this.duration = 750;
        this.tree = null;
        this.isFullScreen = false;
    }

    JusTree.prototype = {
        init: function() {
            this.createSvg();
            this.createChart();
        },
        createSvg: function() {
            this.svgDom = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            this.svg = d3.select(this.svgDom)
                // this.svg = d3.select(this.wrapper).append('svg')
                .attr("width", this.width)
                .attr("height", this.height)
        },
        createChart: function() {
            var _this = this;
            // 创建图表的时候清空容器元素
            document.querySelector(this.wrapper).innerHTML = ''
            d3.select(this.svgDom).remove()

            // 设置图表缩放事件
            this.zoom = d3.zoom()
                .scaleExtent([0.1, 2])
                .on('zoom', redraw);

            function redraw() {
                _this.g.attr('transform', d3.event.transform)
            }

            this.g = this.svg.append("g")
            this.svg.call(this.zoom)

            // 定义树布局
            this.tree = d3.tree()
                .size([2 * Math.PI, this.width / 2 - 150])
                .separation(function(a, b) {
                    return (a.parent == b.parent ? 1 : 2) / a.depth;
                });
            // 获取树布局的节点连线信息
            this.root = this.tree(d3.hierarchy(this.data));
            this.root.x0 = this.height / 2;
            this.root.y0 = 0;

            // 每个节点分支赋予不同的颜色
            if (this.root.children) {
                this.root.children.forEach(function(item, index) {
                    item.color = _this.colors[index]
                    item.rSize = 8
                    setColor(item, item.color, item.rSize)
                })
            }
            this.root.children.forEach(collapse);

            this.update(this.root)

            document.querySelector(this.wrapper).appendChild(this.svgDom)

        },
        update: function(source) {
            var _this = this;
            var treeData = this.tree(this.root);
            var nodes = treeData.descendants();
            nodes.forEach(function(d) { d.y = d.depth * 180 });
            this._setNode(nodes)
            this._setLink(nodes)
//          this._setControl()
        },
        _setNode: function(nodes) {
            var i = 0;
            var _this = this;
            var node = this.g.selectAll('g.node')
                .data(nodes, function(d) { return d.id || (d.id = ++i); });
            var nodeEnter = node.enter().append('g')
                .attr('class', 'node')
                .attr("transform", function(d) {
                    return "translate(" + radialPoint(d.x, d.y) + ")";
                })
                .on('click', function(d) {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    _this.update(d);
                });
            initCircle(nodeEnter)
            initText(nodeEnter)
            var nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(this.duration)
                .attr("transform", function(d) {
                    return "translate(" + radialPoint(d.x, d.y) + ")";
                });
            nodeUpdate.select('circle.node')
                .attr('r', 10)
                .attr('cursor', 'pointer');
            nodeUpdate.select('text.flag')
                .text(function(d) {
                    if (d._children && d.depth > 0) {
                        return '+'
                    } else if (d.children && d.depth > 0) {
                        return '-'
                    }
                })
            var nodeExit = node.exit().transition()
                .duration(this.duration)
                .attr("transform", function(d) {
                    return "translate(" + radialPoint(d.x, d.y) + ")";
                })
                .remove();
               nodeExit.select('circle')
                   .attr('r', 1e-6);
               nodeExit.select('text')
                   .style('fill-opacity', 1e-6);
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        },
        _setLink: function(nodes) {
            var link = this.g.selectAll('path.link')
                .data(nodes.slice(1), function(d) { return d.id; });
            var linkEnter = link.enter().insert('path', "g")
                .attr("class", "link")
                .style('stroke', function(d) {
                    return d.color
                })
                .style('fill','none')
                .style('stroke-width',1.5)
                .style('stroke-opacity',.8)
                .attr("d", function(d) {
                    // if (d.parent === nodes[0]) {
                    //     return "M" + radialPoint(d.x, d.y) +
                    //         " " + radialPoint(d.parent.x, d.parent.y);
                    // } else {
                    return "M" + radialPoint(d.x, d.y) +
                        "C" + radialPoint(d.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, d.parent.y);
                    // }
                })
            var linkUpdate = linkEnter.merge(link);
            linkUpdate.transition()
                .duration(this.duration)
                .style('stroke', function(d) {
                    return d.color
                })
                .attr("d", function(d) {
                    return "M" + radialPoint(d.x, d.y) +
                        "C" + radialPoint(d.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, d.parent.y);
                })
            var linkExit = link.exit().transition()
                .duration(this.duration)
                .attr("d", function(d) {
                    return "M" + radialPoint(d.x, d.y) +
                        "C" + radialPoint(d.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, (d.y + d.parent.y) / 2) +
                        " " + radialPoint(d.parent.x, d.parent.y);
                })
                .remove();
        }
    }
    return JusTree
})));
var width = 0,
    height = 0;

var setColor = (node, color, size) => {
    if (node.children) {
        var rSize = size - 2;
        node.children.forEach(child => {
            child.color = color
            child.rSize = rSize
            setColor(child, color, child.rSize)
        })
    }
}
var initCircle = node => {
	var _this = this
    node.append("circle")
        .attr('r', function(d, i) {
            return d.rSize ? d.rSize : 16
        })
        .attr('class', 'node')
        .style('fill', function(d, i) {
            return d.color ? d.color :"#ff3c00"
        })

    node.append('text')
        .attr('dy', function(d, i) {
            return d.rSize ? d.rSize - 2 : 12 - 4
        })
        .attr('class', 'flag')
        .attr('text-anchor', 'middle')
        .style('fill', '#fff')
        .style('cursor', 'pointer')
        .style('font-size', function(d) {
            return d.rSize ? d.rSize * 2.5 : 12 * 2.5
        })
        .text(function(dd) {
            return (function(d) {
                if (d._children && d.depth > 0) {
                    return '+'
                } else if (d.children && d.depth > 0) {
                    return '-'
                }
            })(dd)
        })
}

var initText = node => {
    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", function(d) {
            return d.x < Math.PI === !d.children ? 15 : -15;
        })
        .attr("text-anchor", function(d) {
            return d.x < Math.PI === !d.children ? "start" : "end";
        })
        .attr("transform", function(d) {
            if (d.depth > 0) {
                return "rotate(" + (d.x < Math.PI ? d.x - Math.PI / 2 : d.x + Math.PI / 2) * 180 / Math.PI + ")";
            } else {
                return "rotate(0)"
            }
        })
        .text(function(d) {
            return d.data.name
        });
}

var collapse = d => {
    if (d.children) {
        d._children = d.children
        d._children.forEach(collapse)
        d.children = null
    }
}

var inFullScreen = () => {
    var de = document.documentElement;
    if (de.requestFullscreen) {
        de.requestFullscreen();
    } else if (de.mozRequestFullScreen) {
        de.mozRequestFullScreen();
    } else if (de.webkitRequestFullScreen) {
        de.webkitRequestFullScreen();
    }
}

var exitFullScreen = () => {
    var de = document;
    if (de.exitFullscreen) {
        de.exitFullscreen();
    } else if (de.mozCancelFullScreen) {
        de.mozCancelFullScreen();
    } else if (de.webkitCancelFullScreen) {
        de.webkitCancelFullScreen();
    }
}

function checkFull() {
    var isFull = document.fullscreenEnabled || window.fullScreen || document.webkitIsFullScreen || document.msFullscreenEnabled;

    //to fix : false || undefined == undefined
    if (isFull === undefined) isFull = false;
    return isFull;
}

var radialPoint = (x, y) => {
    return [(y = +y) * Math.cos(x -= Math.PI / 2) + width / 2, y * Math.sin(x) + height / 2];
}