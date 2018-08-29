/// <reference path="../plugin/maptalks/maptalks.js" />
/************************************************************************************
* Copyright (c) $year$$registeredorganization$ All Rights Reserved.
*文件名：  $MaptalksCallJs$
*版本号：  V1.0.0.0
*创建人：  张利泉
*创建时间：2017年12月27日15:03:31
*描述： maptalks地图方法封装初始化
*注意事项： 所有地图方法必须在底图加载完之后执行；
/************************************************************************************/
var GeoMap = {
    Map: null,//地图
    MapConfig: {},//地图配置

    //#region 读取本地地图服务配置 url为xml地址 所有服务存入GeoMap.MapConfig 通过服务id获取对应服务
    LoadXml: function (url, callfn) {
        $.ajax({
            type: "get",
            url: url,
            dataType: 'xml',
            success: function (data) {
                var xmlConfig = $(data).find("service");
                var urlobj = {};
                for (var i = 0; i < xmlConfig.length; i++) {
                    urlobj[xmlConfig.eq(i).attr("id")] = xmlConfig.eq(i).attr("url");;
                }
                GeoMap.MapConfig = urlobj;
                if (callfn) callfn();
            },
            error: function () {
                alert("加载配置失败！");
            }
        });
    },
    //#endregion 

    //#region 加载底图 url为底图服务地址 MapId为地图容器id 地图加载成功后的回调
    AddBaseLayer: function (url, MapId, callfn) {
        //jsonp 跨域解析
        $.ajax({
            url: url + '?f=pjson', dataType: 'jsonp', success: function (conf) {
                var conf = GeoMap.GetTileLayerConfig(conf);
                var spatialReference = conf.spatialReference;
                GeoMap.zoom = 1;
                GeoMap.center = conf.center
                var BaseLayer = new maptalks.TileLayer("tile", {
                    renderer: 'canvas',//支持图片跨域
                    tileSystem: conf.tileSystem,
                    tileSize: conf.tileSize,
                    urlTemplate: url + '/tile/{z}/{y}/{x}',
                    repeatWorld: false,
                    crossOrigin: true,
                    //cssFilter:"sepia(100%) invert(90%)"//canvas cssFilter
                });
                GeoMap.Map = new maptalks.Map(MapId, {
                    center: [114.29351810722656,30.564308202441403],
                    zoom: 8,//初始化显示层级 可自己更改 
                    minZoom: conf.minZoom,
                    maxZoom: conf.maxZoom,
                    spatialReference: spatialReference,
                    attribution: false,//去掉logo
                    baseLayer: BaseLayer
                });
                var obj={
                    BaseLayer:BaseLayer,
                    SpatialReference:spatialReference
                };
                GeoMap.MapConfig[url]=obj;
                GeoMap.Map.on('click', function (e) {
                    console.log(e.coordinate);
                })
                if (callfn) callfn();
            }, err: function (a) {

            }
        });
    },
    //#endregion

    //#region 获取瓦片底图配置
    GetTileLayerConfig: function (arcConf) {
        var tileInfo = arcConf['tileInfo'],
        tileSize = [tileInfo['cols'], tileInfo['rows']],
        resolutions = [],
        lods = tileInfo['lods'];
        for (var i = 0, len = lods.length; i < len; i++) {
            resolutions.push(lods[i]['resolution']);
        }
        var fullExtent = arcConf['fullExtent'],
            origin = tileInfo['origin'],
            tileSystem = [1, -1, origin['x'], origin['y']];
        var center = [(fullExtent["xmax"] + fullExtent["xmin"]) / 2, (fullExtent["ymax"] + fullExtent["ymin"]) / 2];
        var wkid = tileInfo["spatialReference"].latestWkid;
        var projection;
        if (!wkid) {
            projection = "IDENTITY";
        } else {
            projection = 'EPSG:' + wkid;
        }
        delete fullExtent['spatialReference'];
        return {
            'spatialReference': {
                'projection': projection,
                'resolutions': resolutions,
                'fullExtent': fullExtent
            },
            'center': center,
            'minZoom': 1,
            'maxZoom': lods.length,
            'tileSystem': tileSystem,
            'tileSize': tileSize
        };

    },
    //#endregion

    //#region 调用arcgis服务的query接口 url为查询地址，option为查询参数，callfn返回结果集
    QueryTask: function (url, option, callfn) {
        var filter = GeoMap.GetParaQueryString(option);
        url = url + filter;
        $.ajax({ url: url, dataType: 'jsonp', success: function (e) { if (callfn) callfn(e) }, err: function (a) { } });
        //jsonp可以跨域 json要是用跨域代理
    },
    //#endregion

    //#region 拼接查询参数 option为查询参数
    GetParaQueryString: function (option) {
        var queryString = '/query?';
        var geometry = option.geometry || '';
        var where = option.where || '1=1';
        var condition = {
            where: encodeURIComponent(where),
            geometry: geometry instanceof Object ? JSON.stringify(geometry) : geometry,
            geometryType: option.geometryType || 'esriGeometryPoint',
            inSR: option.inSR || '',
            spatialRel: option.esriSpatialRelIntersects || 'esriSpatialRelIntersects',
            relationParam: option.relationParam || '',
            objectIds: option.objectIds || '',
            time: option.time || '',
            returnCountOnly: option.returnCountOnly || false,
            returnGeometry: option.returnGeometry || false,
            maxAllowableOffset: option.maxAllowableOffset || '',
            outSR: option.outSR || '',
            text: option.text || '',
            outFields: option.outFields || '*'
        };
        for (var p in condition) {
            queryString += "&" + p + "=" + condition[p];
        }
        queryString += "&f=pjson";
        return queryString;
    },
    //#endregion

    //#region 调用arcgis服务的find接口 url为查询地址，option为查询参数，callfn返回结果集
    FindTask: function (url, option, callfn) {
        var filter = GeoMap.GetFindTaskParmString(option);
        url = url + filter;
        $.ajax({ url: url, dataType: 'jsonp', success: function (e) { if (callfn) callfn(e) }, err: function (a) { } });
        //jsonp可以跨域 json要是用跨域代理

    },
    //#endregion 

    //#rengion 拼接FindTask查询参数 option为查询参数
    GetFindTaskParmString: function (option) {
        var ParmString = '/find?';
        var condition = {
            searchText: option.searchText || '',
            contains: option.contains || true,
            searchFields: option.searchFields || '',
            spatialReference: option.spatialReference || '',
            layers:option.layers||0,
            layerDefs:option.layerDefs||'',
            returnGeometry:option.returnGeometry||true,
            maxAllowableOffset:option.maxAllowableOffset||'',
            geometryPrecision:option.geometryPrecision||'',
            dynamicLayers:option.dynamicLayers||'',
            returnZ:option.returnZ||false,
            returnM:option.returnM||false,
            gdbVersion:option.gdbVersion||''
        };
        for (var p in condition) {
            ParmString += "&" + p + "=" + condition[p];
        }
        ParmString += "&f=pjson";
        return ParmString;
    },
    //#endregion


    //#region 清空所有图层
    AllLayerClear: function () {
        if (GeoMap.Map) {
            var layers = GeoMap.Map.getLayers();
            layers.map(function (p) {
                p.clear();
            })
        }
    },
    //#endregion

    //#region 根据经纬获取并返回区划信息和网格编码
    GetAreaMessageByXY: function (x, y, callback) {
        if (x && y) {
            var layer = GeoMap.Map.getLayer('areamessage');
            if (!layer) { layer = new maptalks.VectorLayer("areamessage").addTo(GeoMap.Map) }
            layer.clear();
            var option = {
                geometry: x + "," + y
            }
            var url = GeoMap.MapConfig["wgservice"];
            GeoMap.QueryTask(url, option, function (result) {
                if (result == "") return;
                if (result && result.features) {
                    var attr = result.features[0].attributes;
                    var message = attr.SSQ + attr.SSJ + attr.SSSQ + attr.WGQC;
                    var res = {
                        "WGBM": attr.WGBM,
                        "AreaMessage": message
                    }
                    if (callback) callback(res);
                } else {
                    return
                }
            })
        } else {
            alert("请输入正确的经纬度信息")
        }
    },
    //#endregion

    

    //#region 地图上添加标注点 数据说明：X经度，Y纬度
    AddMarker: function (x,y) {
        if (x&&y) {
            var layer = GeoMap.Map.getLayer("MarkerLayer");
            if (!layer) { layer = new maptalks.VectorLayer("MarkerLayer").addTo(GeoMap.Map); }
            layer.clear();
            var marker = new maptalks.Marker([parseFloat(x), parseFloat(y)], {
                symbol: {
                    "markerFile": "../image/marker-blue.png",
                    //'textName': data[i].RNAME,
                    'textWeight': 'normal',
                    'textFaceName': '"microsoft yahei",arial,sans-serif',
                    'textFill': 'blue',
                    'textSize': 16,
                    'textOpacity': 1,
                    'textDy': -40,
                }
            }).addTo(layer);
        } else {
            alert("请输入正确的经纬度信息");
        }
    },
    //#endregion

};



