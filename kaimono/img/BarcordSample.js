$(function() {
    var bbb = "9784424287018";
	$("#dvBarcord").barcode(bbb, "ean8",{barWidth:2, barHeight:40,output:"css"});
	//$("#dvBarcord8").barcode(bbb, "ean13",{barWidth:2, barHeight:40,output:"css"});
});