//https://q-az.net/elements-drag-and-drop/
 
(function(){
    ////////////////////////////////////////////////////////////////////////
    //　要素の取得（Class）
    ////////////////////////////////////////////////////////////////////////
    var elements = document.getElementsByClassName("drag-and-drop");//硬貨
    var elements2 = document.getElementsByClassName("kaitou");//解答（〇×）
    var elements0 = document.getElementsByClassName("menu");//メニュー
    var elements3 = document.getElementsByClassName("btn");//メニューのボタン
    var elements4 = document.getElementsByClassName("btn2");//
    var tx = document.getElementsByClassName("tx1");//

    ////////////////////////////////////////////////////////////////////////
    //　要素の取得（ID）
    ////////////////////////////////////////////////////////////////////////
    var el_m = document.getElementById('txM');
    var el_w = document.getElementById('txW');
    var el_h = document.getElementById('txH');
    var el_q = document.getElementById('Q');//問題
    var el_g = document.getElementById('G');//合計

    ////////////////////////////////////////////////////////////////////////
    //　効果音の設定
    ////////////////////////////////////////////////////////////////////////
    var audioElem0;
    audioElem0 = new Audio();
    audioElem0.src = "img/sound0.mp3";
 
    var audioElem1;
    audioElem1 = new Audio();
    audioElem1.src = "img/sound1.mp3";
 
    var audioElem2;
    audioElem2 = new Audio();
    audioElem2.src = "img/sound2.mp3";
 
    var audioElem3;
    audioElem3 = new Audio();
    audioElem3.src = "img/sound3.mp3";

    ////////////////////////////////////////////////////////////////////////
    //　変数の設定
    ////////////////////////////////////////////////////////////////////////
    var event;//イベント

    var x;
    var y;
    var xx1;
    var yy1;

    var count = 0;//移動アニメーションカウント用

    var c_move = 0;//コインの移動時に１回だけ音を鳴らすための変数

    var count1 = 0;//範囲内の硬貨の数
    var count10 = 0;//範囲内の硬貨の数
    var count100 = 0;//範囲内の硬貨の数

    var oX = [];//移動アニメーション用（スタート位置座標：X）
    var oY = [];//移動アニメーション用（スタート位置座標：Y）
    var lX = [];//移動アニメーション用（ゴール位置座標：X）
    var lY = [];//移動アニメーション用（ゴール位置座標：Y）
    var zX = [];//移動アニメーション用（移動幅：X）
    var zY = [];//移動アニメーション用（移動幅：Y）

    var flg_c = [];//範囲内にあるかどうか？
    var kingaku = [];//金額
    var num = [];//解答用の数字

    var coin1 = 0;
    var coin10 = 0;
    var coin100 = 0;
    
    var b1_x; var b1_y; var b1_w; var b1_h;//支払BOX
    var b2_x; var b2_y; var b2_w; var b2_h;//両替BOX

    var coin = 0;//金額の合計
    var toi = 0;//問題の金額

    var ryougae = 0;//両替モード
    var TMode;//問題モード
 	var coinH = 1;

    var sw = window.innerWidth;
    var sh = window.innerHeight;
    var sz;//基本サイズ
	el_w.innerHTML = sw;
	el_h.innerHTML = sh;

    ////////////////////////////////////////////////////////////////////////
    //　端末の確認
    ////////////////////////////////////////////////////////////////////////
    var userAgent = window.navigator.userAgent.toLowerCase();
    if(userAgent.indexOf('iphone') != -1) {
        kaitou_left = -40;
    } else if(userAgent.indexOf('ipad') != -1) {
    } else if(userAgent.indexOf('android') != -1) {
        if(userAgent.indexOf('mobile') != -1) {//androidのスマートフォン
        } else {//androidのタブレット
        }
    } else {// 不明
    }

    ////////////////////////////////////////////////////////////////////////
    //　初期設定
    ////////////////////////////////////////////////////////////////////////
    sz = Math.round(sh * 0.08);//初期サイズの決定

    ////////////////////////////////////////////////////////////////////////
    //　バーコードスキャン画面の設定
    ////////////////////////////////////////////////////////////////////////
	document.getElementById('menu').style.width = "100%";
	document.getElementById('menu').style.height = "100%";

    ////////////////////////////////////////////////////////////////////////
    //　カード払いの解答画面の設定
    ////////////////////////////////////////////////////////////////////////
	document.getElementById('card_maru').style.width = "100%";
	document.getElementById('card_maru').style.height = "100%";
	document.getElementById('card_batu').style.width = "100%";
	document.getElementById('card_batu').style.height = "100%";
	
	document.getElementById('card_maru').style.zIndex = 1000;
	document.getElementById('card_batu').style.zIndex = 1000;
    document.getElementById('card_maru').style.visibility = "hidden";
    document.getElementById('card_batu').style.visibility = "hidden";

	document.getElementById('card_tx1a').style.fontSize = sz*0.6 + "px";//買える（メッセージ）
	document.getElementById('card_tx1b').style.fontSize = sz*0.6 + "px";//買える（メッセージ）
	document.getElementById('card_tx2').style.fontSize = sz*0.8 + "px";//買えない（メッセージ）

    ////////////////////////////////////////////////////////////////////////
    //　フォントサイズの設定
    ////////////////////////////////////////////////////////////////////////
    document.body.style.fontSize = sz*0.24+"px";

    document.getElementById('mes0').style.fontSize = sz*0.8+"px";

    document.getElementById('dekita').style.fontSize = sz*0.4+"px";
    document.getElementById('taitoru2').style.fontSize = sz*0.2+"px";
    
    document.getElementById('taitoru1').style.fontSize = sz*1+"px";
	document.getElementById("taitoru1").style.left = sz*5.3 + "px";
	document.getElementById("taitoru1").style.top = sz*0.9 + "px";

    ////////////////////////////////////////////////////////////////////////
    //　支払いBOXの設定
    ////////////////////////////////////////////////////////////////////////
	document.getElementById('box1').style.width = sw*0.7+"px";
	document.getElementById('box1').style.height = sh*0.5+"px";
    //var rect = document.getElementById("seiretu").getBoundingClientRect();
	//document.getElementById("box1").style.top = rect.top + rect.height*1.2 + "px";
	document.getElementById("box1").style.left = "0px";
	document.getElementById("box1").style.top = sz*2.4 + "px";
    b1_x = document.getElementById("box1").getBoundingClientRect().left;
    b1_y = document.getElementById("box1").getBoundingClientRect().top;
    b1_w = document.getElementById("box1").getBoundingClientRect().width;
    b1_h = document.getElementById("box1").getBoundingClientRect().height;

    ////////////////////////////////////////////////////////////////////////
    //　両替BOXの設定
    ////////////////////////////////////////////////////////////////////////
    document.write('<img src="img/ryougae.png" widht="180" height="180" id="box2img" class="free">')
	document.getElementById("box2img").style.left = (sw*0.72)+"px";
	document.getElementById("box2img").style.top = (b1_y + b1_h + sz/4)+"px";
	document.getElementById("box2img").style.zIndex = -1;
    b2_w = 180;//document.getElementById("box2img").getBoundingClientRect().width;
    b2_h = 180;//document.getElementById("box2img").getBoundingClientRect().height;
    b2_x = document.getElementById("box2img").getBoundingClientRect().left;
    b2_y = document.getElementById("box2img").getBoundingClientRect().top;

    ////////////////////////////////////////////////////////////////////////
    //　できたボタンの設定
    ////////////////////////////////////////////////////////////////////////
	document.getElementById('dekita').style.width = (sw*0.26)+"px";
	document.getElementById('dekita').style.height = (b1_h*0.24)+"px";
	document.getElementById("dekita").style.left = (sw*0.72)+"px";
	document.getElementById("dekita").style.top = (b1_y + b1_h/2 - b2_h - sz/4)+"px";

    ////////////////////////////////////////////////////////////////////////
    //　数字の追加
    ////////////////////////////////////////////////////////////////////////
    const img_num  = new Image()
    img_num.src = ('img/num.png')
    document.write('<canvas id="n1_0" class="free" width="' + sz*1.5 + '" height="' + sz*2 + '"></canvas>');
    document.write('<canvas id="n10_0" class="free" width="' + sz*1.5 + '" height="' + sz*2 + '"></canvas>');
    document.write('<canvas id="n100_0" class="free" width="' + sz*1.5 + '" height="' + sz*2 + '"></canvas>');
    document.getElementById('n100_0').style.left = sz*1.5 + "px";
    document.getElementById('n100_0').style.top = sz/3 + "px";
    document.getElementById('n10_0').style.left = sz*2.7 + "px";
    document.getElementById('n10_0').style.top = sz/3 + "px";
    document.getElementById('n1_0').style.left = sz*3.9 + "px";
    document.getElementById('n1_0').style.top = sz/3 + "px";
    //for (var i = 0; i <= 9; i++){
        //document.write('<img src="img/num' + i +'.png" widht=' + sz*2 + ' height=' + sz*2 + ' id=n1_' + i + ' class="free">')
        //document.write('<img src="img/num' + i +'.png" widht=' + sz*2 + ' height=' + sz*2 + ' id=n10_' + i + ' class="free">')
        //document.write('<img src="img/num' + i +'.png" widht=' + sz*2 + ' height=' + sz*2 + ' id=n100_' + i + ' class="free">')

        //document.getElementById('n1_'+i).style.visibility = "hidden";
        //document.getElementById('n10_'+i).style.visibility = "hidden";
        //document.getElementById('n100_'+i).style.visibility = "hidden";
        //document.getElementById('n100_'+i).style.left = sz*1.5 + "px";
        //document.getElementById('n100_'+i).style.top = sz/3 + "px";
        //document.getElementById('n10_'+i).style.left = sz*2.7 + "px";
        //document.getElementById('n10_'+i).style.top = sz/3 + "px";
        //document.getElementById('n1_'+i).style.left = sz*3.9 + "px";
        //document.getElementById('n1_'+i).style.top = sz/3 + "px";
    //}

    ////////////////////////////////////////////////////////////////////////
    //　コインの追加
    ////////////////////////////////////////////////////////////////////////
    for (var i = 0; i < 10; i++){
        kingaku.push(100);
        document.write('<img src="img/c100.png" widht=' + sz + ' height=' + sz + ' id=' + (i+1) + ' class="drag-and-drop">')
    }
    for (var i = 0; i < 20; i++){
        kingaku.push(10);
        document.write('<img src="img/c10.png" widht=' + sz + ' height=' + sz + ' id=' + (i+11) + ' class="drag-and-drop">')
    }
    for (var i = 0; i < 20; i++){
        kingaku.push(1);
        document.write('<img src="img/c1.png" widht=' + sz + ' height=' + sz + ' id=' + (i+31) + ' class="drag-and-drop">')
    }

    for(var i = 1; i <= elements.length; i++) {
	    oX.push(0);
	    oY.push(0);
	    lX.push(0);
	    lY.push(0);
	    zX.push(0);
	    zY.push(0);
	    flg_c.push(0);
        document.getElementById(i).style.zIndex = i;
    }

    ////////////////////////////////////////////////////////////////////////
    //　ヒント用のコインの追加
    ////////////////////////////////////////////////////////////////////////
    for (var i = 0; i < 10; i++){
        document.write('<img src="img/c100.png" widht=' + sz + ' height=' + sz + ' id=h' + (i+1) + ' class="free" style="opacity: 0.2;">')
        document.getElementById('h'+(i+1)).style.visibility = "hidden";
    }
    for (var i = 0; i < 10; i++){
        document.write('<img src="img/c10.png" widht=' + sz + ' height=' + sz + ' id=h' + (i+11) + ' class="free" style="opacity: 0.2;">')
        document.getElementById('h'+(i+11)).style.visibility = "hidden";
    }
    for (var i = 0; i < 10; i++){
        document.write('<img src="img/c1.png" widht=' + sz + ' height=' + sz + ' id=h' + (i+21) + ' class="free" style="opacity: 0.2;">')
        document.getElementById('h'+(i+21)).style.visibility = "hidden";
    }
	for (var i = 0; i < 30; i++){
		var xx = 0;
		var yy = 0;
		if (i < 5){
			xx = 0; yy = b1_y + i* sz;
		} else if (i < 10) {
			xx = 1; yy = b1_y + (i-5) * sz;
		} else if (i < 15){
			xx = 2; yy = b1_y + (i-10) * sz;
		} else if (i < 20) {
			xx = 3; yy = b1_y + (i-15) * sz;
		} else if (i < 25){
			xx = 4; yy = b1_y + (i-20) * sz;
		} else if (i < 30) {
			xx = 5; yy = b1_y + (i-25) * sz;
		}
		document.getElementById('h'+(i+1)).style.left = sw/2 - sz * 4.5 + b1_x + sz * xx + "px";
		document.getElementById('h'+(i+1)).style.top = yy + sz*0.4 + "px";
	}

    ////////////////////////////////////////////////////////////////////////
    //　初期設定（〇×）
    ////////////////////////////////////////////////////////////////////////
    elements2[0].style.zIndex = 100;
    elements2[1].style.zIndex = 100;
    elements2[0].style.top = sh*0.2+"px";
    elements2[1].style.top = sh*0.2+"px";
    elements2[0].style.left = (sw/2) - 250 +"px";
    elements2[1].style.left = (sw/2) - 250 +"px";
    elements2[0].style.visibility = "hidden";
    elements2[1].style.visibility = "hidden";

    ////////////////////////////////////////////////////////////////////////
	//　移動アニメーション（リセット）
    ////////////////////////////////////////////////////////////////////////
	var countup = function(){
		if (count < 10) {
			if (count < 9){
				for (var i = 0; i < elements.length; i++){
					elements[i].style.left = (oX[i] + zX[i]*count)+"px";
					elements[i].style.top = (oY[i] + zY[i]*count)+"px";
				}
			} else {
				for (var i = 0; i < elements.length; i++){
					elements[i].style.left = lX[i]+"px";
					elements[i].style.top = lY[i]+"px";
				}
			}
			count++;
			setTimeout(countup, 1);
		} 
	}
	
    ////////////////////////////////////////////////////////////////////////
	//　初期位置へ整列（リセット） 
    ////////////////////////////////////////////////////////////////////////
	var seiretu_coin = function(){
		count = 0;//カウンターリセット
	    var TT = (sz / 4)*coinH;
	    var LL = sw/2 - (sz+8) * 3.8;

		for (var i = 0; i < 10; i++){
			oX[i] = Number(elements[i].style.left.replace('px', ''));
			oY[i] = Number(elements[i].style.top.replace('px', ''));
			lX[i] = LL + b1_x + (sz+8)*0;
			lY[i] = b1_y + b1_h + (10-i)*TT;
			zX[i] = (lX[i] - oX[i])/10;
			zY[i] = (lY[i] - oY[i])/10;
	        flg_c[i+0] = 0;
	    }
		for (var i = 0; i < 10; i++){
			oX[i+10] = Number(elements[i+10].style.left.replace('px', ''));
			oY[i+10] = Number(elements[i+10].style.top.replace('px', ''));
			lX[i+10] = LL + b1_x + (sz+8)*2;
			lY[i+10] = b1_y + b1_h + (10-i)*TT;
			zX[i+10] = (lX[i+10] - oX[i+10])/10;
			zY[i+10] = (lY[i+10] - oY[i+10])/10;
	        flg_c[i+10] = 0;
			oX[i+30] = Number(elements[i+30].style.left.replace('px', ''));
			oY[i+30] = Number(elements[i+30].style.top.replace('px', ''));
			lX[i+30] = LL + b1_x + (sz+8)*4;
			lY[i+30] = b1_y + b1_h + (10-i)*TT;
			zX[i+30] = (lX[i+30] - oX[i+30])/10;
			zY[i+30] = (lY[i+30] - oY[i+30])/10;
	        flg_c[i+30] = 0;
	    }

		for (var i = 10; i < 20; i++){
			oX[i+10] = Number(elements[i+10].style.left.replace('px', ''));
			oY[i+10] = Number(elements[i+10].style.top.replace('px', ''));
			lX[i+10] = LL + b1_x + (sz+8)*1;
			lY[i+10] = b1_y + b1_h + (20-i)*TT;
			zX[i+10] = (lX[i+10] - oX[i+10])/10;
			zY[i+10] = (lY[i+10] - oY[i+10])/10;
	        flg_c[i+10] = 0;
			oX[i+30] = Number(elements[i+30].style.left.replace('px', ''));
			oY[i+30] = Number(elements[i+30].style.top.replace('px', ''));
			lX[i+30] = LL + b1_x + (sz+8)*3;
			lY[i+30] = b1_y + b1_h + (20-i)*TT;
			zX[i+30] = (lX[i+30] - oX[i+30])/10;
			zY[i+30] = (lY[i+30] - oY[i+30])/10;
	        flg_c[i+30] = 0;
	    }

		// コインの合計再計算
		coin = 0;
		for(var i = 0; i < elements.length; i++) {
			if (flg_c[i]  == 1) {
				coin = coin + kingaku[i];
			}
		}
		el_g.innerHTML = coin;

		for(var i = 0; i < elements.length; i++) {
			elements[i].style.zIndex = i+1;
		}

		countup();//移動アニメーション
		//mup;//ムーブベントハンドラの消去
	}

    ////////////////////////////////////////////////////////////////////////
	//　移動アニメーション（自動整列用）（支払い整列）
    ////////////////////////////////////////////////////////////////////////
	var countup2 = function(){
		if (count < 10) {
			if (count < 9){
				for (var i = 0; i < elements.length; i++){
					if(flg_c[i] == 1 && ((oX[i] != lX[i]) || (oY[i] != lY[i]))){
						elements[i].style.left = (oX[i] + zX[i]*count)+"px";
						elements[i].style.top = (oY[i] + zY[i]*count)+"px";
					}
				}
			} else {
				for (var i = 0; i < elements.length; i++){
					if(flg_c[i] == 1 && ((oX[i] != lX[i]) || (oY[i] != lY[i]))){
						elements[i].style.left = lX[i]+"px";
						elements[i].style.top = lY[i]+"px";
					}
				}
			}
			count++;
			setTimeout(countup2, 1);
		} 
	}

    ////////////////////////////////////////////////////////////////////////
	//　自動整列（支払い整列）
    ////////////////////////////////////////////////////////////////////////
	var seiretu_coin2 = function(){
    	count1 = 0;
    	count10 = 0;
    	count100 = 0;
		count = 0;//カウンターリセット
		for (var i = 0; i < elements.length; i++){
			if(flg_c[i] == 1){
				var xx = 0;
				var yy = 0;
				
				if (count1 < 5){
					if(kingaku[i] == 1){xx = 4; yy = b1_y + count1 * sz; count1++;}
				} else {
					if(kingaku[i] == 1){xx = 5; yy = b1_y + (count1-5) * sz; count1++;}
				}
				if (count10 < 5){
					if(kingaku[i] == 10){xx = 2; yy = b1_y + count10 * sz; count10++;}
				} else {
					if(kingaku[i] == 10){xx = 3; yy = b1_y + (count10-5) * sz; count10++;}
				}
				if (count100 < 5){
					if(kingaku[i] == 100){xx = 0; yy = b1_y + count100 * sz; count100++;}
				} else {
					if(kingaku[i] == 100){xx = 1; yy = b1_y + (count100-5) * sz; count100++;}
				}
				
				oX[i] = Number(elements[i].style.left.replace('px', ''));
				oY[i] = Number(elements[i].style.top.replace('px', ''));
				lX[i] = sw/2 - sz * 4.5 + b1_x + sz * xx;
				lY[i] = yy + sz*0.4;
				zX[i] = (lX[i] - oX[i])/10;
				zY[i] = (lY[i] - oY[i])/10;
			}
		}
		countup2();//移動アニメーション
	}

    ////////////////////////////////////////////////////////////////////////
	//　移動アニメーション（自動整列用）（両替）
    ////////////////////////////////////////////////////////////////////////
	var countup3 = function(){
		if (count < 10) {
			if (count < 9){
					elements[parseInt(event.target.id)-1].style.left = (oX[parseInt(event.target.id)-1] + zX[parseInt(event.target.id)-1]*count)+"px";
					elements[parseInt(event.target.id)-1].style.top = (oY[parseInt(event.target.id)-1] + zY[parseInt(event.target.id)-1]*count)+"px";
			} else {
					elements[parseInt(event.target.id)-1].style.left = lX[parseInt(event.target.id)-1]+"px";
					elements[parseInt(event.target.id)-1].style.top = lY[parseInt(event.target.id)-1]+"px";
			}
			count++;
			setTimeout(countup3(), 1);
		} 
	}
	
    ////////////////////////////////////////////////////////////////////////
	//　自動整列（両替）
    ////////////////////////////////////////////////////////////////////////
	var seiretu_coin3 = function(){
		if(flg_c[parseInt(event.target.id)-1] == 1){
			count = 0;//カウンターリセット
			var xx = 0;
			var yy = 0;
			count1 = coin%10;
			count10 = ((coin/10)%10);
			count100 = coin/100
			
			if(kingaku[parseInt(event.target.id)-1] == 1){xx = 5; yy = b1_y + (count1-1) * sz;}
			if(kingaku[parseInt(event.target.id)-1] == 10){xx = 3; yy = b1_y + (count10-1) * sz;}
			if(kingaku[parseInt(event.target.id)-1] == 100){xx = 1; yy = b1_y + (count100-1) * sz;}
			
			oX[parseInt(event.target.id)-1] = Number(elements[parseInt(event.target.id)-1].style.left.replace('px', ''));
			oY[parseInt(event.target.id)-1] = Number(elements[parseInt(event.target.id)-1].style.top.replace('px', ''));
			lX[parseInt(event.target.id)-1] = sw/2 - sz * 3 + b1_x + sz * xx;
			lY[parseInt(event.target.id)-1] = yy;
			zX[parseInt(event.target.id)-1] = (lX[parseInt(event.target.id)-1] - oX[parseInt(event.target.id)-1])/10;
			zY[parseInt(event.target.id)-1] = (lY[parseInt(event.target.id)-1] - oY[parseInt(event.target.id)-1])/10;

			countup3();//移動アニメーション
		}
	}
	
    ////////////////////////////////////////////////////////////////////////
    //　指定範囲内にあるかの判定（支払い）
    ////////////////////////////////////////////////////////////////////////
    var chk_coin = function(){
        var me_w = event.target.width;
        var me_h = event.target.height;

	el_w.innerHTML = me_w;
	el_h.innerHTML = me_h;
	
        var kh = 0.5;//許容範囲
 
        if (event.target.x >= b1_x - me_w*(kh) && event.target.y >= b1_y - me_h*(kh) && event.target.x <= b1_x + b1_w - me_w*(1-kh) && event.target.y <= b1_y + b1_h -me_h*(1-kh)) {
            flg_c[parseInt(event.target.id)-1] = 1;
        } else {
            flg_c[parseInt(event.target.id)-1] = 0;
        }
 
        coin = 0;
        for(var i = 0; i < elements.length; i++) {
            if (flg_c[i]  == 1) {
                coin = coin + kingaku[i];
            }
        }
        el_g.innerHTML = coin;

    }

    ////////////////////////////////////////////////////////////////////////
    //　両替の範囲内にあるかの判定（両替）
    ////////////////////////////////////////////////////////////////////////
    var chk_coin2 = function(){
        var me_w = event.target.width;
        var me_h = event.target.height;

        coin1 = 0;
        coin10 = 0;
        coin100 = 0;
        for(var i = 0; i < elements.length; i++) {
            if (elements[i].style.visibility == "visible"){
                if(kingaku[i] == 1){coin1++;}
                if(kingaku[i] == 10){coin10++;}
                if(kingaku[i] == 100){coin100++;}
            }
        }

        var kh = 0.5;//許容範囲
 
        if (event.target.x >= b2_x - me_w*(kh) && event.target.y >= b2_y - me_h*(kh) && event.target.x <= b2_x + b2_w - me_w*(1-kh) && event.target.y <= b2_y + b2_h -me_h*(1-kh)) {
            if(kingaku[parseInt(event.target.id)-1] == 10){
            // 両替１０円
                if(coin1 <= 10){
                    document.getElementById(parseInt(event.target.id)).style.visibility = "hidden";
                    flg_c[parseInt(event.target.id)-1] = 0;
		        	for (var i = coin1; i < coin1+10; i++){
		            	document.getElementById(i+31).style.visibility = "visible";
		        	}
                    coin1=coin1+10;
                    seiretu_coin3();// 初期位置へ整列
                }
            }
            if(kingaku[parseInt(event.target.id)-1] == 100){
                //両替１００円
                if(coin10 <= 10){
                    document.getElementById(parseInt(event.target.id)).style.visibility = "hidden";
                    flg_c[parseInt(event.target.id)-1] = 0;
		        	for (var i = coin10; i < coin10+10; i++){
		            	document.getElementById(i+11).style.visibility = "visible";
		        	}
                    coin10=coin10+10;
                    seiretu_coin3();// 初期位置へ整列
                }
            }
    	}

    	el_w.innerHTML = kingaku[parseInt(event.target.id)-1]+"円";
	    el_h.innerHTML = "1円の数"+coin1+"   10円の数"+coin10;

    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（解答）
    ////////////////////////////////////////////////////////////////////////
    for(var i = 0; i < elements2.length; i++) {
        elements2[i].addEventListener("mousedown", mdown2, false);
        elements2[i].addEventListener("touchstart", mdown2, false);
    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（コイン）
    ////////////////////////////////////////////////////////////////////////
    for(var i = 0; i < elements.length; i++) {
        elements[i].addEventListener("mousedown", mdown, false);
        elements[i].addEventListener("touchstart", mdown, false);
    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（リセット）
    ////////////////////////////////////////////////////////////////////////
    document.getElementById("seiretu").addEventListener("mousedown", reset_on, false);
    document.getElementById("seiretu").addEventListener("touchstart", reset_on, false);

    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（もどる）
    ////////////////////////////////////////////////////////////////////////
    document.getElementById("modoru").addEventListener("mousedown", modoru_on, false);
    document.getElementById("modoru").addEventListener("touchstart", modoru_on, false);

    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（できた）
    ////////////////////////////////////////////////////////////////////////
    document.getElementById("dekita").addEventListener("mousedown", dekita_on, false);
    document.getElementById("dekita").addEventListener("touchstart", dekita_on, false);

    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（会計ボタン）
    ////////////////////////////////////////////////////////////////////////
    for(var i = 1; i <= 3; i++) {
        document.getElementById("kaikei"+i).addEventListener("mousedown", kaikei_on, false);
        document.getElementById("kaikei"+i).addEventListener("touchstart", kaikei_on, false);
    }

    ////////////////////////////////////////////////////////////////////////
    //　マウスが要素内で押されたとき、又はタッチされたとき発火（カード払い）
    ////////////////////////////////////////////////////////////////////////
    document.getElementById("card_maru").addEventListener("mousedown", card_on, false);
    document.getElementById("card_maru").addEventListener("touchstart", card_on, false);
    document.getElementById("card_batu").addEventListener("mousedown", card_on, false);
    document.getElementById("card_batu").addEventListener("touchstart", card_on, false);

    ////////////////////////////////////////////////////////////////////////
    //　選択無効
    ////////////////////////////////////////////////////////////////////////
    document.onselectstart = function() {
        return false;
    }
    
    ////////////////////////////////////////////////////////////////////////
    //　カード戻る
    ////////////////////////////////////////////////////////////////////////
    function card_on(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
 
		document.getElementById('menu').style.visibility = "visible";
        document.getElementById('card_maru').style.visibility = "hidden";
        document.getElementById('card_batu').style.visibility = "hidden";
        foo();
    }

    ////////////////////////////////////////////////////////////////////////
    //　リセット
    ////////////////////////////////////////////////////////////////////////
    function reset_on(e) {
        count1 = 0;
        count10 = 0;
        count100 = 0;
        Start();
        seiretu_coin();// 初期位置へ整列
        mdown2()
        scrollTo(0, 0);
    }
    
    ////////////////////////////////////////////////////////////////////////
    //　もどる
    ////////////////////////////////////////////////////////////////////////
    function modoru_on(e) {
		document.getElementById('menu').style.visibility = "visible";
    }
    
    ////////////////////////////////////////////////////////////////////////
    //　できた！
    ////////////////////////////////////////////////////////////////////////
    function dekita_on(e) {
	    // コイン合計再計算
    	coin = 0;
   		for(var i = 0; i < elements.length; i++) {
        	if (flg_c[i]  == 1) {
            	coin = coin + kingaku[i];
        	}
    	}
    	el_g.innerHTML = coin;
 
		if(toi == coin){
	    	audioElem1.play();
	    	document.getElementById("mes1").innerHTML = "ちょうどです！！";
	    	elements2[0].style.visibility = "visible";
	    	elements2[1].style.visibility = "hidden";
            mode = 0;
            saifu = saifu - toi;
        	document.getElementById("s_saifu").innerHTML = saifu;
 
		} else if(toi < coin){
	    	audioElem1.play();
	    	document.getElementById("mes1").innerHTML = "おつりは " + String(coin-toi) + "円です！";
	    	elements2[0].style.visibility = "visible";
	    	elements2[1].style.visibility = "hidden";
            mode = 0;
            saifu = saifu - toi;
        	document.getElementById("s_saifu").innerHTML = saifu;

        } else {
            audioElem2.play();
 
            elements2[0].style.visibility = "hidden";
            elements2[1].style.visibility = "visible";
        }
        scrollTo(0, 0);
    }

    ////////////////////////////////////////////////////////////////////////
    //　メニューボタン
    ////////////////////////////////////////////////////////////////////////
    function kaikei_on(e) {
        //同様にマウスとタッチの差異を吸収
        if(e.type === "mousedown") {
            event = e;
        } else {
            event = e.changedTouches[0];
        }
        if (event.target.id == "kaikei1"){
            TMode = 1;
            mode = 0;
            if (ggg <= saifu){
    	    	audioElem1.play();//正解
　　　	    	document.getElementById("mes0").innerHTML = "のこりは　" + String(saifu-ggg) + " 円です！";
                document.getElementById('card_maru').style.visibility = "visible";
            } else {
    	    	audioElem2.play();//おしい
                document.getElementById('card_batu').style.visibility = "visible";
            }
        }
        if (event.target.id == "kaikei2"){
            TMode = 2;
            mode = 1; 
            if (ggg <= saifu){
                Start();
            } else {
                TMode = 1;
                mode = 0; 
    	    	audioElem2.play();
                document.getElementById('card_batu').style.visibility = "visible";
            }
        }
        if (event.target.id == "kaikei3"){
            TMode = 3;
            mode = 1;
            if (ggg <= saifu){
                Start();
            } else {
                TMode = 1;
                mode = 0; 
    	    	audioElem2.play();
                document.getElementById('card_batu').style.visibility = "visible";
            }
        }
    }
        
    ////////////////////////////////////////////////////////////////////////
    //　問題作成
    ////////////////////////////////////////////////////////////////////////
	function Start() {
        document.getElementById('menu').style.visibility = "hidden";

        document.getElementById('card_maru').style.visibility = "hidden";
        document.getElementById('card_batu').style.visibility = "hidden";

  	    coinH = 1;
  	    //coinH = 2;
	    for (var i = 0; i < 10; i++){//100
	        document.getElementById(i+1).style.visibility = "hidden";
	    }
	    for (var i = 0; i < 20; i++){//10 & 1
	        document.getElementById(i+11).style.visibility = "hidden";
	        document.getElementById(i+31).style.visibility = "hidden";
	    }

		if (saifu == 500) {//小遣い５００円スタート
            coin100 = 5;
            coin10 = 0;
            coin1 = 0;
		    for (var i = 0; i < coin100; i++){
		        document.getElementById(i+1).style.visibility = "visible";
		    }
		    for (var i = 0; i < coin10; i++){
		        document.getElementById(i+11).style.visibility = "visible";
		    }
		    for (var i = 0; i < coin1; i++){
		        document.getElementById(i+31).style.visibility = "visible";
		    }

		} else if (saifu == 1000) {//小遣い１０００円スタート
            coin100 = 9;
            coin10 = 9;
            coin1 = 10;
		    for (var i = 0; i < coin10; i++){
		        document.getElementById(i+1).style.visibility = "visible";
		        document.getElementById(i+11).style.visibility = "visible";
		    }
		    for (var i = 0; i < coin1; i++){
		        document.getElementById(i+31).style.visibility = "visible";
		    }

		} else {//２回目以降＝残金
            coin100 = saifu/100;
            coin10 = (saifu/10)%10;
            coin1 = saifu%10;
            
            if(coin100 > 0){
		        for (var i = 1; i <= coin100; i++){
		            document.getElementById(i+1).style.visibility = "visible";
		        }
			}
			if(coin10 > 0){
		        for (var i = 1; i <= coin10; i++){
		            document.getElementById(i+11).style.visibility = "visible";
		        }
            }
            if(coin1 > 0){
		        for (var i = 1; i <= coin1; i++){
		            document.getElementById(i+31).style.visibility = "visible";
		        }
            }
		}

		toi = ggg;
  		audioElem3.play();
		seiretu_coin(event);// 初期位置へ整列
		//el_q.innerHTML = toi;

        // ヒント用コインの表示
        coin100 = parseInt(toi/100);
        coin10 = parseInt((toi/10)%10);
        coin1 = parseInt(toi%10);
        
        //金額の設定
        document.getElementById('n1_0').getContext('2d').clearRect(0, 0, sz*1.5, sz*2);
        document.getElementById('n10_0').getContext('2d').clearRect(0, 0, sz*1.5, sz*2);
        document.getElementById('n100_0').getContext('2d').clearRect(0, 0, sz*1.5, sz*2);
        document.getElementById('n1_0').getContext('2d').drawImage( img_num, 100*coin1, 0, 100, 150, 0, 0, sz*1.5, sz*2);
        document.getElementById('n10_0').getContext('2d').drawImage( img_num, 100*coin10, 0, 100, 150, 0, 0, sz*1.5, sz*2);
        document.getElementById('n100_0').getContext('2d').drawImage( img_num, 100*coin100, 0, 100, 150, 0, 0, sz*1.5, sz*2);

        //document.getElementById('n100_' + coin100).style.visibility = "visible";
        //document.getElementById('n10_' + coin10).style.visibility = "visible";
        //document.getElementById('n1_' + coin1).style.visibility = "visible";
        
	    for (var i = 1; i <= 30; i++){//ヒント用コイン非表示
	        document.getElementById('h'+i).style.visibility = "hidden";
	    }
        if (TMode == 2) {
            if(coin100 > 0){
		        for (var i = 1; i <= coin100; i++){
		            document.getElementById('h'+(i)).style.visibility = "visible";
		        }
			}
			if(coin10 > 0){
		        for (var i = 1; i <= coin10; i++){
		            document.getElementById('h'+(i+10)).style.visibility = "visible";
		        }
            }
            if(coin1 > 0){
		        for (var i = 1; i <= coin1; i++){
		            document.getElementById('h'+(i+20)).style.visibility = "visible";
		        }
            }
        }

		mdown2()
		scrollTo(0, 0);

	}

    ////////////////////////////////////////////////////////////////////////
    //　マウスが押された際の関数
    ////////////////////////////////////////////////////////////////////////
    function mdown2(e) {
        //タッチデイベントとマウスのイベントの差異を吸収
        if(e.type === "mousedown") {
            var event = e;
        } else {
            var event = e.changedTouches[0];
        }
        elements2[0].style.visibility = "hidden";
        elements2[1].style.visibility = "hidden";
 
        if (event.target.id == "maru" || event.target.id == "canvas1"){
            //audioElem3.play();
            //seiretu_coin(event);// 初期位置へ整列
		    //el_q.innerHTML = toi;
        }
    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスが押された際の関数
    ////////////////////////////////////////////////////////////////////////
    function mdown(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
 
        //クラス名に .drag を追加
        this.classList.add("drag");
 
        //タッチデイベントとマウスのイベントの差異を吸収
        if(e.type === "mousedown") {
            event = e;
        } else {
            event = e.changedTouches[0];
        }
 
        // すべての要素を並べ替えます
        var aaa = document.getElementById(event.target.id).style.zIndex;
        for(var i = 1 ; i <= elements.length; i++) {
            if (document.getElementById(i).style.zIndex > aaa){
                document.getElementById(i).style.zIndex = document.getElementById(i).style.zIndex - 1;
            }
        }
        document.getElementById(event.target.id).style.zIndex = elements.length;
 
        //要素内の相対座標を取得
        x = event.pageX - this.offsetLeft;
        y = event.pageY - this.offsetTop;
 
        //ムーブイベントにコールバック
        document.body.addEventListener("mousemove", mmove, false);
        document.body.addEventListener("touchmove", mmove, false);
        
        foo();
    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスカーソルが動いたときに発火
    ////////////////////////////////////////////////////////////////////////
    function mmove(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();

        //ドラッグしている要素を取得
        var drag = document.getElementsByClassName("drag")[0];
 
        //同様にマウスとタッチの差異を吸収
        if(e.type === "mousemove") {
            event = e;
        } else {
            event = e.changedTouches[0];
        }

        if (event.target.id == "box1"){
            //ムーブベントハンドラの消去
            document.body.removeEventListener("mousemove", mmove, false);
            drag.removeEventListener("mouseup", mup, false);
            document.body.removeEventListener("touchmove", mmove, false);
            drag.removeEventListener("touchend", mup, false);
 
            //クラス名 .drag も消す
            drag.classList.remove("drag");
        } else {
	        audioElem0.play();

        	//chk_coin();// 指定範囲内にあるかの判定 

        	//フリックしたときに画面を動かさないようにデフォルト動作を抑制
        	e.preventDefault();
 
        	var xx = event.pageX - x;
        	var yy = event.pageY - y;
        	if(yy < 0){yy = 0;}
        	if(yy > sh-sz){yy = sh-sz;}
        	if(xx < 0){xx = 0;}
        	if(yy > b1_y+b1_h){
        	    if(xx > sw-sz){
            	    xx = sw-sz;
                }
        	} else {
        	    if(xx > b1_w-sz){
            	    xx = b1_w-sz;
                }
        	}
        	drag.style.top = yy + "px";
        	drag.style.left = xx + "px";
 
        	//マウスボタンが離されたとき、またはカーソルが外れたとき発火
        	drag.addEventListener("mouseup", mup, false);
        	document.body.addEventListener("mouseleave", mup, false);
        	drag.addEventListener("touchend", mup, false);
        	document.body.addEventListener("touchleave", mup, false);
        	
        	foo();
        }
    }
 
    ////////////////////////////////////////////////////////////////////////
    //　マウスボタンが上がったら発火
    ////////////////////////////////////////////////////////////////////////
    function mup(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();

        //ドラッグしている要素を取得
        var drag = document.getElementsByClassName("drag")[0];
        
        //同様にマウスとタッチの差異を吸収
        if(e.type === "mouseup") {
            event = e;
        } else {
            event = e.changedTouches[0];
        }
        
        chk_coin();// 指定範囲内にあるかの判定 
        chk_coin2();// 両替の範囲内にあるかの判定 
 
        seiretu_coin2();// 自動整列
 
        //ムーブベントハンドラの消去
        document.body.removeEventListener("mousemove", mmove, false);
        drag.removeEventListener("mouseup", mup, false);
       	document.body.removeEventListener("mouseleave", mup, false);
        document.body.removeEventListener("touchmove", mmove, false);
        drag.removeEventListener("touchend", mup, false);
       	document.body.removeEventListener("touchleave", mup, false);
 
        //クラス名 .drag も消す
        drag.classList.remove("drag");
        
        foo();
    }
})()