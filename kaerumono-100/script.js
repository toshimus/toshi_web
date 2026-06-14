//https://q-az.net/elements-drag-and-drop/
 
(function(){

    ////////////////////////////////////////////////////////////////////////
    // 初期設定
    ////////////////////////////////////////////////////////////////////////
    var event;
    var x;
    var y;
    
    var count = 0;//アニメーション用
    var kingaku = [];//金額
    var s_name = [];//商品名
    var fl_name = [];//ファイル名
    var zumi = [0,0,0,0,0];//正誤のフラグ
    var zumi2 = [0,0,0,0,0];//正誤のフラグ
    var seikai = 0;//正解の数
    var flg_card = -1;

    var el_q = document.getElementById('Q');
    
    var jyunban = "";

    var sw = window.innerWidth;
    var sh = window.innerHeight;
    var sz;//基本サイズ

    ////////////////////////////////////////////////////////////////////////
    // 端末の確認
    ////////////////////////////////////////////////////////////////////////
    var userAgent = window.navigator.userAgent.toLowerCase();
    if(userAgent.indexOf('iphone') != -1) {
    } else if(userAgent.indexOf('ipad') != -1) {
    } else if(userAgent.indexOf('android') != -1) {
        if(userAgent.indexOf('mobile') != -1) {//androidのスマートフォン
        } else {//androidのタブレット
        }
    } else if (sw > sh) {// 横長
        sw = 1024*0.55;
        sh = 1258*0.55;
    } else {// 不明
        //sw = 1024*0.55;
        //sh = 1258*0.55;
    }
    sz = sw*0.15;

    var oX = [];//移動アニメーション用（スタート位置座標：X）
    var oY = [];//移動アニメーション用（スタート位置座標：Y）
    var lX = [];//移動アニメーション用（ゴール位置座標：X）
    var lY = [];//移動アニメーション用（ゴール位置座標：Y）
    var zX = [];//移動アニメーション用（移動幅：X）
    var zY = [];//移動アニメーション用（移動幅：Y）

    document.getElementById("www").innerHTML = sw;
    document.getElementById("hhh").innerHTML = sh;
    document.getElementById("zzz").innerHTML = flg_card;

    var b1_x; var b1_y; var b1_w; var b1_h;//

    document.body.style.fontSize = sz*0.24+"px";
    document.getElementById('tx1').style.fontSize = sz*0.7+"px";
    document.getElementById('tx2').style.fontSize = sz*0.4+"px";
    document.getElementById('tx3').style.fontSize = sz*0.1+"px";
    el_q.innerHTML = "500";

    ////////////////////////////////////////////////////////////////////////
    // カート設定
    ////////////////////////////////////////////////////////////////////////
    document.getElementById('box1').style.width = sw*0.25 + "px";
    document.getElementById('box1').style.height = sz + "px";
    document.getElementById("box1").style.left = sz*0.2 +"px";
    document.getElementById("box1").style.top = sz*3 + "px";
    b1_x = document.getElementById("box1").getBoundingClientRect().left;
    b1_y = document.getElementById("box1").getBoundingClientRect().top;
    b1_w = document.getElementById("box1").getBoundingClientRect().width;
    b1_h = document.getElementById("box1").getBoundingClientRect().height;
    document.getElementById('box1b').style.width = 4 + "px";
    document.getElementById('box1b').style.height = b1_h + sz*0.2 + "px";
    document.getElementById("box1b").style.left = b1_x+b1_w - 1 +"px";
    document.getElementById("box1b").style.top = b1_y + "px";

    ////////////////////////////////////////////////////////////////////////
    // かいけい・ボタン設定
    ////////////////////////////////////////////////////////////////////////
    document.getElementById('kaikei').style.width = sz*1.2 + "px";
    document.getElementById('kaikei').style.height = sz*0.6 + "px";
    document.getElementById('kaikei').style.left = sw*0.8 +"px";
    document.getElementById('kaikei').style.top = sh*0.24 + "px";
    document.getElementById("kaikei").style.visibility = "hidden";

    ////////////////////////////////////////////////////////////////////////
    // スタート・ボタン設定
    ////////////////////////////////////////////////////////////////////////
    document.getElementById('start').style.fontSize = sz*0.4 +"px";
    document.getElementById('start').style.width = sz*2.8 + "px";
    document.getElementById('start').style.height = sz*1 + "px";
    document.getElementById('start').style.left = sw*0.5-sz*2.8/2 +"px";
    document.getElementById('start').style.top = sh*0.3 + "px";

    ////////////////////////////////////////////////////////////////////////
    // メモリ作成
    ////////////////////////////////////////////////////////////////////////
    var memW = sw * 0.2;
    document.write('<div class="free" id="memoriZ" style="background:#CCC;"></div>')
    document.getElementById('memoriZ').style.width = memW*5/2 + b1_w + 2 + "px";
    document.getElementById('memoriZ').style.height = sz*1.2 + "px";
    document.getElementById('memoriZ').style.left = b1_x +"px";
    document.getElementById('memoriZ').style.top = b1_y+b1_h + sz*0.2 + "px";

    // ステータスバー作成
    document.write('<div class="free" id="bar" style="background:#B00;"></div>')
    document.getElementById('bar').style.width = 0 + "px";
    document.getElementById('bar').style.height = sz/4 + "px";
    document.getElementById('bar').style.left = b1_x+b1_w +"px";
    document.getElementById('bar').style.top = b1_y+b1_h + sz*0.2 + "px";

    for (var i = 0; i <= 50; i++){
        if (i <= 50) {
            document.write('<div class="free" id="memori' + i + '" style="background:#777;"></div>')
        }else{
            document.write('<div class="free" id="memori' + i + '" style="background:#F00;"></div>')
        }        
        document.getElementById('memori'+i).style.width = 2 + "px";
        if (i == 50) {
            document.getElementById('memori'+i).style.height = sz + "px";
            document.getElementById('memori'+i).style.width = 4 + "px";
            document.getElementById('memori'+i).style.backgroundColor = "#F00";
        } else if (i%10 == 0) {
            document.getElementById('memori'+i).style.height = sz/2 + "px";
        } else if (i%5 == 0) {
            document.getElementById('memori'+i).style.height = sz/3 + "px";
        } else {
            document.getElementById('memori'+i).style.height = sz/4 + "px";
        }
        document.getElementById('memori'+i).style.left = b1_x+b1_w+i*memW/10/2 +"px";
        document.getElementById('memori'+i).style.top = b1_y+b1_h + sz*0.2 + "px";
    }
    
    for (var i = 0; i <= 4; i++){
        document.write('<div class="free" id="tx_m' + i + '">' + i*100 + '円</div>')
        document.getElementById('tx_m'+i).style.fontSize = sz*0.15+"px";
        document.getElementById("tx_m"+i).style.left = b1_x+b1_w - 1.8*sz/10 + i*memW/2 + "px";
        document.getElementById("tx_m"+i).style.top = b1_y+b1_h + sz/2 + sz*0.2 + "px";
    }
    document.getElementById("tx_m0").style.left = b1_x+b1_w - 0.5*sz/10 + "px";

    // ５００円玉
    //document.write('<img src="img/coin_500.png" widht=' + sz + ' height=' + sz + ' id="coin500" class="free" position="absolute">')
    document.write('<canvas class="free" id="coin500" width='+sz+' height='+sz+'></canvas>')
    document.getElementById('coin500').style.left = b1_x+b1_w+50*memW/10/2 - sz/2 + 2 + "px";
    document.getElementById('coin500').style.top = b1_y+b1_h + sz/2 + sz*0.2 + "px";

    ////////////////////////////////////////////////////////////////////////
    // カード作成
    ////////////////////////////////////////////////////////////////////////
    document.write('<div class="drag-and-drop" id="card1" align="center" style="background:#EEE;">'+
                   '<canvas id="pic1" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="1"></div><div id="en1"></div></div>')
    document.write('<div class="drag-and-drop" id="card2" align="center" style="background:#EEE;">'+
                   '<canvas id="pic2" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="2"></div><div id="en2"></div></div>')
    document.write('<div class="drag-and-drop" id="card3" align="center" style="background:#EEE;">'+
                   '<canvas id="pic3" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="3"></div><div id="en3"></div></div>')
    document.write('<div class="drag-and-drop" id="card4" align="center" style="background:#EEE;">'+
                   '<canvas id="pic4" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="4"></div><div id="en4"></div></div>')
    document.write('<div class="drag-and-drop" id="card5" align="center" style="background:#EEE;">'+
                   '<canvas id="pic5" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="5"></div><div id="en5"></div></div>')
    for(var i = 1; i <= 5; i++) {
        document.getElementById(i).style.width = sz + "px";
        document.getElementById(i).style.height = sz + "px";
        oX.push(0);
        oY.push(0);
        lX.push(0);
        lY.push(0);
        zX.push(0);
        zY.push(0);
        document.getElementById("card"+i).style.visibility = "hidden";
    }

    for (var i = 0; i < 5; i++){
        fl_name.push(0);
        s_name.push(0);
        kingaku.push(0);
    }

    ////////////////////////////////////////////////////////////////////////
    // タイヤ作成
    ////////////////////////////////////////////////////////////////////////
    document.write('<div class="free" id="taiya1">●</div>')
    document.getElementById('taiya1').style.fontSize = sz*1+"px";
    document.write('<div class="free" id="taiya2">●</div>')
    document.getElementById('taiya2').style.fontSize = sz*1+"px";
    document.getElementById("taiya1").style.left = sz*0.2 +"px";
    document.getElementById("taiya1").style.top = sz*3.4 + "px";
    document.getElementById("taiya2").style.left = sz*1.3 +"px";
    document.getElementById("taiya2").style.top = sz*3.4 + "px";

    ////////////////////////////////////////////////////////////////////////
    // スタート画面の準備
    ////////////////////////////////////////////////////////////////////////
    document.getElementById('box1').style.visibility = "hidden";
    document.getElementById('box1b').style.visibility = "hidden";
    document.getElementById("taiya1").style.visibility = "hidden";
    document.getElementById("taiya2").style.visibility = "hidden";

    ////////////////////////////////////////////////////////////////////////
    // 〇×作成
    ////////////////////////////////////////////////////////////////////////
    for (var i = 0; i < 5; i++){
        document.write('<img src="img/maru.png" class="free" id="maru' + i +'" width="' + sz + '" position="absolute" alt="">')
        document.write('<img src="img/batu.png" class="free" id="batu' + i +'" width="' + sz + '" position="absolute" alt="">')

        document.getElementById("maru"+i).style.left = sw/2 + (i-2.5) * (sz+16)-sz*0.01 + "px";
        document.getElementById("maru"+i).style.top = sh-sz*2 + "px";
        document.getElementById("batu"+i).style.left = sw/2 + (i-2.5) * (sz+16)-sz*0.01 + "px";
        document.getElementById("batu"+i).style.top = sh-sz*2 + "px";
        document.getElementById("maru"+i).style.visibility = "hidden";
        document.getElementById("batu"+i).style.visibility = "hidden";
    }
    
    document.write('<div class="free" id="kaitou1" align="center"><img src="img/maru2.png" class="free" id="maru" width="' + sz*2.4 + '" alt=""></div>')
    document.write('<div class="free" id="kaitou2" align="center"><img src="img/batu2.png" class="free" id="batu" width="' + sz*2.4 + '" alt=""></div>')
    for (var i = 1; i <= 2; i++){
        document.getElementById("kaitou"+i).style.visibility = "hidden";
        document.getElementById("kaitou"+i).style.width = sw+ "px";
        document.getElementById("kaitou"+i).style.height = sh+ "px";
    }

    document.write('<div class="free" id="kuria1" style="background:#FFF;"><br>'+
                   '<div style="width:100%; margin:0 auto;text-align:center; background-color:#55FFFF;">かんぺき！よくできたね！</div>'+
                   '<div class="free" id="bar1" style="background:#CFF;"></div>'+
                   '<div class="free" id="kaeru1" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえる○</div>'+
                   '<div class="free" id="kaenai1" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえない×</div>'+
                   '<canvas class="free" id="pic11" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic12" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic13" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic14" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic15" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<div class="free" id="en11"></div>'+
                   '<div class="free" id="en12"></div>'+
                   '<div class="free" id="en13"></div>'+
                   '<div class="free" id="en14"></div>'+
                   '<div class="free" id="en15"></div>'+
                   '<canvas class="free" id="coin5001" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="kekka1"></div><div class="free" id="kekka1z"></div>'+
                   '<input type="button" class="free" id="next1" value="つぎの もんだい" style="background:#DDD;"></div>')
                   
    document.write('<div class="free" id="kuria2" style="background:#FFF;"><br>'+
                   '<div style="width:100%; margin:0 auto;text-align:center; background-color:#FFFF55;">いいね！よくできたね！</div>'+
                   '<div class="free" id="bar2" style="background:#FFC;"></div>'+
                   '<div class="free" id="kaeru2" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえる○</div>'+
                   '<div class="free" id="kaenai2" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえない×</div>'+
                   '<canvas class="free" id="pic21" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic22" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic23" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic24" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic25" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<div class="free" id="en21"></div>'+
                   '<div class="free" id="en22"></div>'+
                   '<div class="free" id="en23"></div>'+
                   '<div class="free" id="en24"></div>'+
                   '<div class="free" id="en25"></div>'+
                   '<canvas class="free" id="coin5002" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="kekka2"></div><div class="free" id="kekka2z"></div>'+
                   '<input type="button" class="free" id="next2" value="つぎの もんだい" style="background:#DDD;"></div>')
                   
    document.write('<div class="free" id="kuria3" style="background:#FFF;"><br>'+
                   '<div style="width:100%; margin:0 auto;text-align:center; background-color:#FF8888;">おしい！もうすこし！</div>'+
                   '<div class="free" id="bar3" style="background:#FCC;"></div>'+
                   '<div class="free" id="kaeru3" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえる○</div>'+
                   '<div class="free" id="kaenai3" style="width:35%; margin:0 auto;text-align:center; background-color:#EEEEEE;">かえない×</div>'+
                   '<canvas class="free" id="pic31" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic32" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic33" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic34" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<canvas class="free" id="pic35" width='+sz*1.3+' height='+sz+'></canvas>'+
                   '<div class="free" id="en31"></div>'+
                   '<div class="free" id="en32"></div>'+
                   '<div class="free" id="en33"></div>'+
                   '<div class="free" id="en34"></div>'+
                   '<div class="free" id="en35"></div>'+
                   '<canvas class="free" id="coin5003" width='+sz+' height='+sz+'></canvas>'+
                   '<div class="free" id="kekka3"></div><div class="free" id="kekka3z"></div>'+
                   '<input type="button" class="free" id="next3" value="つぎの もんだい" style="background:#DDD;"></div>')

    for (var i = 1; i <= 3; i++){
	    document.getElementById('coin500'+i).style.left = sz*1 + "px";
		document.getElementById('coin500'+i).style.top = sz*3 + "px";

        document.getElementById("bar"+i).style.width = sw+"px";
        document.getElementById("bar"+i).style.height = sz*3+"px";
		document.getElementById('bar'+i).style.left = "0px";
		document.getElementById('bar'+i).style.top = sz*3.5-3 + "px";

        document.getElementById("kuria"+i).style.visibility = "hidden";
        document.getElementById("kuria"+i).style.fontSize = sz*0.5+"px";
        document.getElementById("kuria"+i).style.width = "100%";
        document.getElementById("kuria"+i).style.height = "100%";
        
        document.getElementById("next"+i).style.fontSize = sz*0.35+"px";
        document.getElementById("next"+i).style.width = "45%";
        document.getElementById("next"+i).style.height = sz*1 + "px";
        document.getElementById("next"+i).style.left = sz*3.5 + "px";
        document.getElementById("next"+i).style.top = sz*6.8 + "px";
        
        document.getElementById("kekka"+i).style.fontSize = sz*0.4+"px";
        document.getElementById("kekka"+i+"z").style.fontSize = sz*0.2+"px";
        document.getElementById("kekka"+i).style.left = sz*0.2 + "px";
        document.getElementById("kekka"+i).style.top = sz*6.8 + "px";
        document.getElementById("kekka"+i+"z").style.left = sz*0.2 + "px";
        document.getElementById("kekka"+i+"z").style.top = sz*7.3 + "px";

        document.getElementById("kaenai"+i).style.fontSize = sz*0.4+"px";
        document.getElementById("kaenai"+i).style.left = sz*0.4 + "px";
        document.getElementById("kaenai"+i).style.top = sz*2 + "px";

        document.getElementById("kaeru"+i).style.fontSize = sz*0.4+"px";
        document.getElementById("kaeru"+i).style.left = sz*0.4 + "px";
        document.getElementById("kaeru"+i).style.top = sz*5 + "px";
        
        for (var j = 1; j <= 5; j++){
            document.getElementById("pic"+i+j).style.left = sz*3.5+"px";
            document.getElementById("pic"+i+j).style.top = sz*0.5+j*sz+"px";

            document.getElementById('en'+i+j).style.fontSize = sz*0.3+"px";
            document.getElementById("en"+i+j).style.left = sz*5.2+"px";
            document.getElementById("en"+i+j).style.top = sz*0.5+j*sz+"px";
        }
    }

    ////////////////////////////////////////////////////////////////////////
    // 判定後の解説用のキャンバス
    ////////////////////////////////////////////////////////////////////////
    document.write('<div class="free" id="kaisetu" align="center" style="background:#5EE;">'+
                   '<canvas id="c_kaisetu" width='+sw+' height='+sz*4+'></canvas></div>')
    document.getElementById("kaisetu").style.width = sw+"px";
    document.getElementById("kaisetu").style.height = sz*4+"px";
    document.getElementById('kaisetu').style.left = "0px";
    document.getElementById('kaisetu').style.top = sz*4.5 + "px";
    document.getElementById('kaisetu').style.visibility = "hidden";
           
    ////////////////////////////////////////////////////////////////////////
    // 移動アニメーション
    ////////////////////////////////////////////////////////////////////////
    var countup2 = function(){
        if (count < 20) {
            if (count < 19){
                for (var i = 0; i < 5; i++){
                    document.getElementById("card"+(i+1)).style.left = (oX[i] + zX[i]*count)+"px";
                    document.getElementById("card"+(i+1)).style.top = (oY[i] + zY[i]*count)+"px";
                }
            } else {
                for (var i = 0; i < 5; i++){
                    document.getElementById("card"+(i+1)).style.left = lX[i]+"px";
                    document.getElementById("card"+(i+1)).style.top = lY[i]+"px";
                    document.getElementById("card"+(i+1)).style.width = sz + "px";
                    document.getElementById("card"+(i+1)).style.height = sz*1.35 + "px";
                }
            }
            count++;
            setTimeout(countup2, 5);
        } 
    }

    ////////////////////////////////////////////////////////////////////////
    // カード整列アニメーション
    ////////////////////////////////////////////////////////////////////////
    function seiretu_anime() {
        count = 0;//カウンターリセット

    	for (var i = 0; i < 5; i++){
            oX[i] = sw/2 + (i-2.5) * (sz+16) + sz * 10;
            oY[i] = sh-sz*2;
            lX[i] = sw/2 + (i-2.5) * (sz+16);
            lY[i] = sh-sz*2;
            zX[i] = (lX[i] - oX[i])/20;
            zY[i] = (lY[i] - oY[i])/20;
        }
        countup2();//移動アニメーション
    }

    ////////////////////////////////////////////////////////////////////////
    // リセット
    ////////////////////////////////////////////////////////////////////////
    function reset() {
        document.getElementById('bar').style.width = 0 + "px";
        flg_card = -1;
    	for (var i = 0; i < 5; i++){
            //document.getElementById(i+1).style.visibility = "visible";
            document.getElementById("card"+(i+1)).style.left = sw/2 + (i-2.5) * (sz+16) + "px";
            document.getElementById("card"+(i+1)).style.top = sh-sz*2 + "px";
        }

        // カート設定
        document.getElementById('box1').style.width = sw*0.25 + "px";
        document.getElementById('box1').style.height = sz + "px";
        document.getElementById("box1").style.left = sz*0.2 +"px";
        document.getElementById("box1").style.top = sz*3 + "px";
        b1_x = document.getElementById("box1").getBoundingClientRect().left;
        b1_y = document.getElementById("box1").getBoundingClientRect().top;
        b1_w = document.getElementById("box1").getBoundingClientRect().width;
        b1_h = document.getElementById("box1").getBoundingClientRect().height;
        document.getElementById('box1b').style.width = 4 + "px";
        document.getElementById('box1b').style.height = b1_h + sz*0.2 + "px";
        document.getElementById("box1b").style.left = b1_x+b1_w - 1 +"px";
        document.getElementById("box1b").style.top = b1_y + "px";
        document.getElementById("taiya1").style.left = sz*0.2 +"px";
        document.getElementById("taiya1").style.top = sz*3.4 + "px";
        document.getElementById("taiya2").style.left = sz*1.3 +"px";
        document.getElementById("taiya2").style.top = sz*3.4 + "px";
        
        document.getElementById("kaitou1").style.visibility = "hidden";
        document.getElementById("kaitou2").style.visibility = "hidden";

        document.getElementById('kaisetu').style.visibility = "hidden";
    }
    
    ////////////////////////////////////////////////////////////////////////
    // ALL リセット
    ////////////////////////////////////////////////////////////////////////
    function all_reset() {
        audioElem3.play();
        document.getElementById('bar').style.width = 0 + "px";
        flg_card = -1;
    	for (var i = 0; i < 5; i++){
            zumi[i] = 0;
            zumi2[i] = 0;
            document.getElementById("maru"+i).style.visibility = "hidden";
            document.getElementById("batu"+i).style.visibility = "hidden";
        }
        seiretu_anime();

        // カート設定
        document.getElementById('box1').style.width = sw*0.25 + "px";
        document.getElementById('box1').style.height = sz + "px";
        document.getElementById("box1").style.left = sz*0.2 +"px";
        document.getElementById("box1").style.top = sz*3 + "px";
        b1_x = document.getElementById("box1").getBoundingClientRect().left;
        b1_y = document.getElementById("box1").getBoundingClientRect().top;
        b1_w = document.getElementById("box1").getBoundingClientRect().width;
        b1_h = document.getElementById("box1").getBoundingClientRect().height;
        document.getElementById('box1b').style.width = 4 + "px";
        document.getElementById('box1b').style.height = b1_h + sz*0.2 + "px";
        document.getElementById("box1b").style.left = b1_x+b1_w - 1 +"px";
        document.getElementById("box1b").style.top = b1_y + "px";
        document.getElementById("taiya1").style.left = sz*0.2 +"px";
        document.getElementById("taiya1").style.top = sz*3.4 + "px";
        document.getElementById("taiya2").style.left = sz*1.3 +"px";
        document.getElementById("taiya2").style.top = sz*3.4 + "px";

        document.getElementById("kaitou1").style.visibility = "hidden";
        document.getElementById("kaitou2").style.visibility = "hidden";

        seikai = 0;
        //document.getElementById('kaikei').value = "かいけい！";
        document.getElementById("kuria1").style.visibility = "hidden";
        document.getElementById("kuria2").style.visibility = "hidden";
        document.getElementById("kuria3").style.visibility = "hidden";


       // 新しい問題
        var col = new Array("〇","〇","〇","×","×");
        
	    var countOK = 0;
	    var countNG = 0;
	    var i = 0;
	    col[0] = 0;
	    col[1] = 0;
	    col[2] = 0;
	    col[3] = 0;
	    col[4] = 0;
	        while (countOK < 3) {
    	        var r = Math.floor( Math.random() * data.length);
    	        if (syouhin[r][3] == 'ok'){
    	            if (countOK == 1 && col[0] == r){
	                } else if (countOK == 2 && col[0] == r){
	                } else if (countOK == 2 && col[1] == r){
	                } else {
                        col[i] = r;
	                    countOK++;
	                    i++;
	                }
	            }
	        }
	        while (countNG < 2) {
    	        var r = Math.floor( Math.random() * data.length);
    	        if (syouhin[r][3] == 'ng'){
    	            if (countNG == 1 && col[3] == r){
	                } else {
                        col[i] = r;
	                    countNG++;
	                    i++;
	                }
	            }
	        }

    //配列の大きさに合わせて適当な回数繰り返す
    for ( i = 0 ; i < 30 ; i++ ) {
        //0～4までの乱数を作成し、変数Rndに格納する
        var rnd = Math.floor(Math.random()*5);
  
        var str1 = col[0];    //配列colの最初の要素
        var str2 = col[rnd];  //配列colの乱数で決定した要素

        //配列の各要素を入れ替える
        col[rnd] = str1;
        col[0]   = str2;
    }

	for (var i = 0; i < 5; i++){
	    fl_name[i] = syouhin[col[i]][0];
	    s_name[i] = syouhin[col[i]][1]+"{"+col[i]+"}";
	    kingaku[i] = syouhin[col[i]][2];    
    }

	        for (var i = 0; i < 5; i++){
		        var zz9 = parseInt(fl_name[i]/100);
				var yy9 = parseInt((fl_name[i]/10)%10);
		        var xx9 = parseInt(fl_name[i]%10);
		        document.getElementById('pic'+(i+1)).getContext('2d').clearRect(0, 0, sz, sz);

		        if (zz9 == 1) {
		            document.getElementById('pic'+(i+1)).getContext('2d').drawImage(img_pic1, 100*xx9, 100*yy9, 100, 100, 0, 0, sz, sz);
		        } else if (zz9 == 2) {
		            document.getElementById('pic'+(i+1)).getContext('2d').drawImage(img_pic2, 100*xx9, 100*yy9, 100, 100, 0, 0, sz, sz);
		        } else if (zz9 == 3) {
		            document.getElementById('pic'+(i+1)).getContext('2d').drawImage(img_pic3, 100*xx9, 100*yy9, 100, 100, 0, 0, sz, sz);
		        } else if (zz9 == 4) {
		            document.getElementById('pic'+(i+1)).getContext('2d').drawImage(img_pic4, 100*xx9, 100*yy9, 100, 100, 0, 0, sz, sz);
		        } else if (zz9 == 5) {
		            document.getElementById('pic'+(i+1)).getContext('2d').drawImage(img_pic5, 100*xx9, 100*yy9, 100, 100, 0, 0, sz, sz);
		        }
	            document.getElementById("en"+(i+1)).innerHTML = kingaku[i]+"円";
	            //document.getElementById("en"+(i+1)).innerHTML = s_name[i];
	            document.getElementById("en"+(i+1)).style.fontSize = sz*0.2+"px";
		    }
		document.getElementById('coin500').getContext('2d').drawImage(img_500, 0, 0, 125, 125, 0, 0, sz, sz);//５００円表示
        document.getElementById('kaisetu').style.visibility = "hidden";
    }

    ////////////////////////////////////////////////////////////////////////
    // カード整列
    ////////////////////////////////////////////////////////////////////////
    function seiretu() {
    	for (var i = 0; i < 5; i++){
            if (flg_card == i){
                document.getElementById("card"+(i+1)).style.left = b1_x + b1_w/2 - sz/2  + "px";
                document.getElementById("card"+(i+1)).style.top = b1_y - b1_h/2 + "px";
            } else {
                document.getElementById("card"+(i+1)).style.left = sw/2 + (i-2.5) * (sz+16) + "px";
                document.getElementById("card"+(i+1)).style.top = sh-sz*2 + "px";
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////
    // 移動アニメーション
    ////////////////////////////////////////////////////////////////////////
    var countup = function(){
        if (count < 10) {
            if (count < 9){

                document.getElementById("zzz").innerHTML = kingaku[flg_card] +":" + (kingaku[flg_card]/10)*count;

                document.getElementById('bar').style.width = (zX[0]*count) + "px";
                if ((kingaku[flg_card]/20)*count <= 500) {
                    document.getElementById('bar').style.backgroundColor = "#0AF";
                } else {
                    document.getElementById('bar').style.backgroundColor = "#F00";
                }
                document.getElementById("box1").style.left = (oX[0] + zX[0]*count)+"px";
                document.getElementById("box1").style.top = (oY[0] + zY[0]*count)+"px";
                document.getElementById("box1b").style.left = (oX[1] + zX[1]*count)+"px";
                document.getElementById("box1b").style.top = (oY[1] + zY[1]*count)+"px";
                document.getElementById("card"+(flg_card+1)).style.left = (oX[2] + zX[2]*count)+"px";
                document.getElementById("card"+(flg_card+1)).style.top = (oY[2] + zY[2]*count)+"px";
                document.getElementById("taiya1").style.left = (oX[3] + zX[3]*count)+"px";
                document.getElementById("taiya1").style.top = (oY[3] + zY[3]*count)+"px";
                document.getElementById("taiya2").style.left = (oX[4] + zX[4]*count)+"px";
                document.getElementById("taiya2").style.top = (oY[4] + zY[4]*count)+"px";
            } else {
                //////////////////////////////////////////////////////////////////
                // 合否判定！！！！！！
                //////////////////////////////////////////////////////////////////
                document.getElementById('bar').style.width = (kingaku[flg_card]/10)*memW/10/2 + "px";
                if (Number(kingaku[flg_card]) <= 500) {
                    zumi[flg_card] = 1;//正解
                    audioElem1.play();
                    document.getElementById("kaitou1").style.visibility = "visible";
                    document.getElementById("maru"+flg_card).style.visibility = "visible";
                    document.getElementById('bar').style.backgroundColor = "#0AF";

                    seikai = 0;
                    matigai = 1;
                    for (var i = 0; i < 5; i++){
                        if (zumi[i] == 1){
                            seikai++;
                        } else if (zumi[i] == 2){
                            matigai++;
                        }
                    }
                    
                    //////////////////////////////////////////////////////////////////
                    // 結果発表！！！！！！
                    //////////////////////////////////////////////////////////////////
                    if (seikai == 3){
                        hantei();
                    }//次の問題へ！

                } else {
                    zumi[flg_card] = 2;//不正解                    
                    audioElem2.play();
                    document.getElementById("kaitou2").style.visibility = "visible";
                    document.getElementById("batu"+flg_card).style.visibility = "visible";
                    document.getElementById('bar').style.backgroundColor = "#F00";
                    
                    seikai = 0;
                    matigai = 1;
                    for (var i = 0; i < 5; i++){
                        if (zumi[i] == 1){
                            seikai++;
                        } else if (zumi[i] == 2){
                            matigai++;
                        }
                    }
                    //////////////////////////////////////////////////////////////////
                    // 結果発表！！！！！！
                    //////////////////////////////////////////////////////////////////
                    if (matigai == 3){
                        hantei();
                    }//次の問題へ！
                }

                document.getElementById("box1").style.left = lX[0]+"px";
                document.getElementById("box1").style.top = lY[0]+"px";
                document.getElementById("box1b").style.left = lX[1]+"px";
                document.getElementById("box1b").style.top = lY[1]+"px";
                document.getElementById("card"+(flg_card+1)).style.left = lX[2]+"px";
                document.getElementById("card"+(flg_card+1)).style.top = lY[2]+"px";
                document.getElementById("taiya1").style.left = lX[3]+"px";
                document.getElementById("taiya1").style.top = lY[3]+"px";
                document.getElementById("taiya2").style.left = lX[4]+"px";
                document.getElementById("taiya2").style.top = lY[4]+"px";

                b1_x = document.getElementById("box1").getBoundingClientRect().left;
                b1_y = document.getElementById("box1").getBoundingClientRect().top;
                b1_w = document.getElementById("box1").getBoundingClientRect().width;
                b1_h = document.getElementById("box1").getBoundingClientRect().height;

                document.getElementById("maru").style.left = b1_x - sz*0.34 + "px";
                document.getElementById("maru").style.top = sh/2 - sz*2.3 + "px";
                if (b1_x > sw) {
                    document.getElementById("batu").style.left = sw*0.6 + "px";
                } else {
                    document.getElementById("batu").style.left = b1_x - sz*0.34 + "px";
                }
                document.getElementById("batu").style.top = sh/2 - sz*2.3 + "px";

                //////////////////////////////////////////////////////////////////
                // 解説表示（選んだ商品が５００円より高いか安いか？）
                //////////////////////////////////////////////////////////////////
                if (seikai <= 3 && matigai <= 3){
                    document.getElementById('kaisetu').style.visibility = "visible";
                    var i = flg_card;
                    var zz9 = parseInt(fl_name[i]/100);
                    var yy9 = parseInt((fl_name[i]/10)%10);
                    var xx9 = parseInt(fl_name[i]%10);
                    document.getElementById('c_kaisetu').getContext('2d').clearRect(0, 0, sw, sz*4);

                    //コンテキストを生成
                    var cvs = document.getElementById("c_kaisetu");
                    var ctx = cvs.getContext("2d");
                    ctx.fillStyle='#AFA';     //塗りつぶしの色を赤に指定
                    ctx.fillRect(0, 0, sw/2, sz*4);

                    //ctx.strokeStyle = '#f00';
                    //ctx.lineWidth = 5;
                    //ctx.strokeText('＜', sw/2-sz*0.9, sz*2);  // 座標 (20, 80) にテキスト描画
                    ctx.fillStyle = 'rgba(255, 0, 0)';
                    ctx.font = 'bold ' + sz*0.18 + 'pt sans-serif';
                    if (Number(kingaku[flg_card]) < 500){
                        ctx.fillText('やすい から かえます！', sz*0.2, sz*0.4);  // 座標 (20, 50) にテキスト描画
                        ctx.fillText(Number(kingaku[flg_card])+' 円', sz*0.2, sz*2.2);  // 座標 (20, 50) にテキスト描画
                        ctx.font = 'bold ' + sz*1.3 + 'pt sans-serif';
                        ctx.fillText('＜', sw/2-sz*0.9, sz*2);  // 座標 (20, 50) にテキスト描画
                    } else if(Number(kingaku[flg_card]) == 500) {
                        ctx.fillText('おなじ だから かえます！', sz*0.2, sz*0.4);  // 座標 (20, 50) にテキスト描画
                        ctx.fillText(Number(kingaku[flg_card])+' 円', sz*0.2, sz*2.2);  // 座標 (20, 50) にテキスト描画
                        ctx.font = 'bold ' + sz*1.3 + 'pt sans-serif';
                        ctx.fillText('＝', sw/2-sz*0.9, sz*2);  // 座標 (20, 50) にテキスト描画
                    } else {
                        ctx.fillText('たかい から かえません！', sz*0.2, sz*0.4);  // 座標 (20, 50) にテキスト描画
                        ctx.fillText(Number(kingaku[flg_card])+' 円', sz*0.2, sz*2.2);  // 座標 (20, 50) にテキスト描画
                        ctx.font = 'bold ' + sz*1.3 + 'pt sans-serif';
                        ctx.fillText('＞', sw/2-sz*0.9, sz*2);  // 座標 (20, 50) にテキスト描画
                    }

                    var sz3 = sz*1.5;
                    var szX = sz*0.5;
                    var szY = sz*0.5;
                    if (zz9 == 1) {
                        document.getElementById('c_kaisetu').getContext('2d').drawImage(img_pic1, 100*xx9, 100*yy9, 100, 100, szX, szY, sz3, sz3);
                    } else if (zz9 == 2) {
                        document.getElementById('c_kaisetu').getContext('2d').drawImage(img_pic2, 100*xx9, 100*yy9, 100, 100, szX, szY, sz3, sz3);
                    } else if (zz9 == 3) {
                        document.getElementById('c_kaisetu').getContext('2d').drawImage(img_pic3, 100*xx9, 100*yy9, 100, 100, szX, szY, sz3, sz3);
                    } else if (zz9 == 4) {
                        document.getElementById('c_kaisetu').getContext('2d').drawImage(img_pic4, 100*xx9, 100*yy9, 100, 100, szX, szY, sz3, sz3);
                    } else if (zz9 == 5) {
                        document.getElementById('c_kaisetu').getContext('2d').drawImage(img_pic5, 100*xx9, 100*yy9, 100, 100, szX, szY, sz3, sz3);
                    }
                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_500, 0, 0, 125, 125, sz*4.5, sz*0.5, sz*1.5, sz*1.5);//５００円表示


                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*3.7+sz*0.55*0, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*3.7+sz*0.55*1, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*3.7+sz*0.55*2, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*3.7+sz*0.55*3, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                    document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*3.7+sz*0.55*4, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                    if (Number(kingaku[flg_card]) <= 500) {
                        for (var i = 0; i < Number(kingaku[flg_card])/100; i++){
                            document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*0.2+sz*0.55*i, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                        }
                    } else if (Number(kingaku[flg_card]) <= 1000) {
                        for (var i = 0; i < 5; i++){
                            document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*0.2+sz*0.55*i, sz*2.5, sz*0.55, sz*0.55);//1００円表示
                        }
                        for (var i = 0; i < (Number(kingaku[flg_card])/100)-5; i++){
                            document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*0.2+sz*0.55*i, sz*3.1, sz*0.55, sz*0.55);//1００円表示
                        }
                    } else {
                        var maxCoin = 30;
                        if (Number(kingaku[flg_card]) < 2000) { maxCoin = Number(kingaku[flg_card])/100 }

                        for (var i = 0; i < maxCoin; i++){
                            var rX = Math.floor( Math.random() * sz*1.8);
                            var rY = Math.floor( Math.random() * sz);
                            document.getElementById('c_kaisetu').getContext('2d').drawImage(img_100, 0, 0, 102, 102, sz*0.3+rX, sz*2.2+rY, sz*0.55, sz*0.55);//1００円表示
                        }
                    }
                }

            }
            count++;
            setTimeout(countup, 30);
        } 
    }
    
    ////////////////////////////////////////////////////////////////////////
    // 判 定
    ////////////////////////////////////////////////////////////////////////
    var hantei = function(){
        //////////////////////////////////////////////////////////////////
        // データ保存
        //////////////////////////////////////////////////////////////////
        data_s = localStorage.kaimono100;
        now = new Date();
        YY1 = now.getFullYear();
        MM1 = now.getMonth()+1;
        DD1 = now.getDate();
        HH2 = now.getHours();
        MM2 = now.getMinutes();
        SS2 = now.getSeconds();
        data_s = data_s + YY1 + "年" + MM1 + "月" + DD1 + "日" + HH2 + ":" + MM2 + ":" + SS2 + ",";
        
        if(matigai == 1) {data_s = data_s + "評価【◎】[" + jyunban + "],";}
        if(matigai == 2) {data_s = data_s + "評価【○】[" + jyunban + "],";}
        if(matigai == 3) {data_s = data_s + "評価【△】[" + jyunban + "],";}

        for (var i = 0; i < 5; i++){
            if(zumi[i] == 1) {
                sss = "●:" + s_name[i] + "(" + kingaku[i] + ")";
            } else if (zumi[i] == 2) {
                sss = "×:" + s_name[i] + "(" + kingaku[i] + ")";
            } else {
                sss = "◇:" + s_name[i] + "(" + kingaku[i] + ")";
            }
            data_s = data_s + sss + ",";
        }
        localStorage.kaimono100 = data_s;
        jyunban = "";

        //////////////////////////////////////////////////////////////////
        // 集計＆結果表示
        //////////////////////////////////////////////////////////////////
        var str = data_s;
        var count1 = 0;  // 文字数を格納
        var count2 = 0;  // 文字数を格納
        var count3 = 0;  // 文字数を格納

        var strSearch1 = '◎';  // 探す文字
        var strSearch2 = '○';  // 探す文字
        var strSearch3 = '△';  // 探す文字
        var count9a = 0;
        var count9z = 0;
        for (var i = 0; i < str.length; i++){
            if (str[i] == strSearch1){count1++; count9a++; if (count9a>count9z) { count9z=count9a; } }
            if (str[i] == strSearch2){count2++; count9a = 0;}
            if (str[i] == strSearch3){count3++; count9a = 0;}
        }

        var avg = Math.round((count1/(count1+count2+count3))*100*10)/10;
        document.getElementById("kekka1").innerHTML = "正答率 "+avg+" ％";
        document.getElementById("kekka2").innerHTML = "正答率 "+avg+" ％";
        document.getElementById("kekka3").innerHTML = "正答率 "+avg+" ％";
        document.getElementById("kekka1z").innerHTML = "連続正解の最大数 "+count9z+" 回／全"+(count1+count2+count3)+" 回";
        document.getElementById("kekka2z").innerHTML = "連続正解の最大数 "+count9z+" 回／全"+(count1+count2+count3)+" 回";
        document.getElementById("kekka3z").innerHTML = "連続正解の最大数 "+count9z+" 回／全"+(count1+count2+count3)+" 回";
    }

    ////////////////////////////////////////////////////////////////////////
    // 解答アニメーション    
    ////////////////////////////////////////////////////////////////////////
    var kaitou_anime = function(){
        count = 0;//カウンターリセット

        oX[0] = Number(document.getElementById("box1").getBoundingClientRect().left);//.replace('px', '')
        oY[0] = Number(document.getElementById("box1").getBoundingClientRect().top);

        oX[1] = Number(document.getElementById("box1b").getBoundingClientRect().left);
        oY[1] = Number(document.getElementById("box1b").getBoundingClientRect().top);

        oX[2] = Number(document.getElementById("card"+(flg_card+1)).getBoundingClientRect().left);
        oY[2] = Number(document.getElementById("card"+(flg_card+1)).getBoundingClientRect().top);

        oX[3] = Number(document.getElementById("taiya1").getBoundingClientRect().left);
        oY[3] = Number(document.getElementById("taiya1").getBoundingClientRect().top);

        oX[4] = Number(document.getElementById("taiya2").getBoundingClientRect().left);
        oY[4] = Number(document.getElementById("taiya2").getBoundingClientRect().top);
        
        var susumu = Number(kingaku[flg_card]);
        if(susumu > 1000){susumu = 1000;}
        for (var i = 0; i <= 4; i++){
            lX[i] = oX[i] + (susumu/10)*memW/10/2;
            lY[i] = oY[i];
            zX[i] = (lX[i] - oX[i])/10;
            zY[i] = (lY[i] - oY[i])/10;
        }

        countup();//移動アニメーション
    }

    ////////////////////////////////////////////////////////////////////////
    // マウスが要素内で押されたとき、又はタッチされたとき発火
    ////////////////////////////////////////////////////////////////////////
    for(var i = 1; i <= 5; i++) {
        document.getElementById('card'+i).addEventListener("mousedown", mdown, false);
        document.getElementById('card'+i).addEventListener("touchstart", mdown, false);
    }

    ////////////////////////////////////////////////////////////////////////
    // マウスが要素内で押されたとき、又はタッチされたとき発火
    ////////////////////////////////////////////////////////////////////////
    document.getElementById("kaitou1").addEventListener("mousedown", mdown2, false);
    document.getElementById("kaitou1").addEventListener("touchstart", mdown2, false);
    document.getElementById("kaitou2").addEventListener("mousedown", mdown2, false);
    document.getElementById("kaitou2").addEventListener("touchstart", mdown2, false);

    document.getElementById("start").addEventListener("mousedown", mdown9s, false);
    document.getElementById("start").addEventListener("touchstart", mdown9s, false);

    document.getElementById("kaikei").addEventListener("mousedown", mdown9a, false);
    document.getElementById("kaikei").addEventListener("touchstart", mdown9a, false);

    for (var i = 1; i <= 3; i++){
        document.getElementById("next"+i).addEventListener("mousedown", mdown9z, false);
        document.getElementById("next"+i).addEventListener("touchstart", mdown9z, false);
    }

    ////////////////////////////////////////////////////////////////////////
    // 選択無効
    ////////////////////////////////////////////////////////////////////////
    document.onselectstart = function() {
        return false;
    }

    ////////////////////////////////////////////////////////////////////////
    //  マウスが押された際の関数【ボタン】スタート
    ////////////////////////////////////////////////////////////////////////
    function mdown9s(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
        document.getElementById("start").style.visibility = "hidden";
        document.getElementById("kaikei").style.visibility = "visible";
	    document.getElementById('box1').style.visibility = "visible";
	    document.getElementById('box1b').style.visibility = "visible";
	    document.getElementById("taiya1").style.visibility = "visible";
	    document.getElementById("taiya2").style.visibility = "visible";
       for(var i = 1; i <= 5; i++) {
	        document.getElementById("card"+i).style.visibility = "visible";
	    }
            all_reset();//スタート時オールリセット
        foo();
    };
    
    ////////////////////////////////////////////////////////////////////////
    //  マウスが押された際の関数【ボタン】かいけい！
    ////////////////////////////////////////////////////////////////////////
    function mdown9a(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
        
        jyunban = jyunban + (flg_card+1);
        
        kaitou_anime();        
        foo();
    };
    
    ////////////////////////////////////////////////////////////////////////
    //  マウスが押された際の関数【ボタン】つぎの問題へ
    ////////////////////////////////////////////////////////////////////////
    function mdown9z(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
        all_reset();
        foo();
    };

    ////////////////////////////////////////////////////////////////////////
    // マウスが押された際の関数（１回目：結果発表 ＆ ２回目：次の問題へ）
    ////////////////////////////////////////////////////////////////////////
    function mdown2(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();
        
        if (seikai == 3 || matigai == 3){//１回目
            //reset();
            document.getElementById('kaisetu').style.visibility = "hidden";
            
            // 最後の要素を除いて、すべての要素を並べ替えます
            for(var i = 0; i < 5-1; i++){
                // 下から上に順番に比較します
                for(var j = 5-1; j > i; j--){
                    // 上の方が小さいときは互いに入れ替えます
                    if (Number(kingaku[j]) > Number(kingaku[j-1])) {
                        var t = kingaku[j];
	                    kingaku[j] = kingaku[j-1];
	                    kingaku[j-1] = t;

                        t = fl_name[j];
	                    fl_name[j] = fl_name[j-1];
	                    fl_name[j-1] = t;

                        t = s_name[j];
	                    s_name[j] = s_name[j-1];
	                    s_name[j-1] = t;

                        t = zumi[j];
	                    zumi[j] = zumi[j-1];
	                    zumi[j-1] = t;
                    }
	            }
            }
            
	        for (var i = 0; i < 5; i++){
		        var zz9 = parseInt(fl_name[i]/100);
				var yy9 = parseInt((fl_name[i]/10)%10);
		        var xx9 = parseInt(fl_name[i]%10);
		        document.getElementById('pic1'+(i+1)).getContext('2d').clearRect(0, 0, sz*1.3, sz);
		        document.getElementById('pic2'+(i+1)).getContext('2d').clearRect(0, 0, sz*1.3, sz);
		        document.getElementById('pic3'+(i+1)).getContext('2d').clearRect(0, 0, sz*1.3, sz);

		        if (zz9 == 1) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_pic1, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_pic1, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_pic1, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		        } else if (zz9 == 2) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_pic2, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_pic2, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_pic2, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		        } else if (zz9 == 3) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_pic3, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_pic3, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_pic3, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		        } else if (zz9 == 4) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_pic4, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_pic4, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_pic4, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		        } else if (zz9 == 5) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_pic5, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_pic5, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_pic5, 100*xx9, 100*yy9, 100, 100, sz*0.3, 0, sz, sz);
		        }
		        
                if (zumi[i] == 1) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_maru, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_maru, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_maru, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
                } else if (zumi[i] == 2) {
		            document.getElementById('pic1'+(i+1)).getContext('2d').drawImage(img_batu, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
		            document.getElementById('pic2'+(i+1)).getContext('2d').drawImage(img_batu, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
		            document.getElementById('pic3'+(i+1)).getContext('2d').drawImage(img_batu, 0, 0, 100, 100, 0, 0, sz*0.5, sz*0.5);
		        }

	            document.getElementById("en1"+(i+1)).innerHTML = kingaku[i]+"円";
	            document.getElementById("en2"+(i+1)).innerHTML = kingaku[i]+"円";
	            document.getElementById("en3"+(i+1)).innerHTML = kingaku[i]+"円";	            
		    }
      		document.getElementById('coin5001').getContext('2d').drawImage(img_500, 0, 0, 125, 125, 0, 0, sz, sz);//５００円表示
       		document.getElementById('coin5002').getContext('2d').drawImage(img_500, 0, 0, 125, 125, 0, 0, sz, sz);//５００円表示
       		document.getElementById('coin5003').getContext('2d').drawImage(img_500, 0, 0, 125, 125, 0, 0, sz, sz);//５００円表示

		    // 結果表示
            document.getElementById("kuria"+matigai).style.visibility = "visible";

        }else{//２回目
            reset();//スタート時オールリセット
        }
                
        foo();
    }

    ////////////////////////////////////////////////////////////////////////
    // マウスが押された際の関数
    ////////////////////////////////////////////////////////////////////////
    function mdown(e) {
        // touchstar以降のイベントを発生させないように（最後はfoo();）
        e.preventDefault();


        // もし待機モードなら操作不能に！
        if(seikai >= 3){return;}
 
        //タッチデイベントとマウスのイベントの差異を吸収
        if(e.type === "mousedown") {
            event = e;
        } else {
            event = e.changedTouches[0];
        }
 
        // 当たり判定：https://qiita.com/hp0me/items/57f901e9b0babe1a320e
        flg_card = event.target.id-1;
        seiretu();

        foo();      
    }
    
    ////////////////////////////////////////////////////////////////////////
    // 先生用：データ出力（CSV）と共有機能（Web Share API）の追加
    ////////////////////////////////////////////////////////////////////////
    var btnExport = document.getElementById("exportData");
    if (btnExport) {
        btnExport.addEventListener("mousedown", exportCSV, false);
        btnExport.addEventListener("touchstart", exportCSV, {passive: false});
    }

    function exportCSV(e) {
        e.preventDefault();
        
        var data_str = localStorage.kaimono100;
        if (!data_str) {
            alert("出力するデータがありません。");
            return;
        }

        // 文字化け防止（BOM付きUTF-8）と、CSVとして見やすい改行の挿入
        var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        var formattedData = data_str.replace(/買い物学習,/g, "買い物学習\n")
                                    .replace(/評価/g, "\n評価");
                                    
        var blob = new Blob([bom, formattedData], { type: "text/csv;charset=utf-8;" });
        var fileName = "kaimono_record.csv";
        var file = new File([blob], fileName, { type: "text/csv" });

        // iPadOS等のネイティブ共有メニュー（AirDrop等）を呼び出す
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: '買い物学習記録',
                text: '生徒の買い物学習の履歴データです。'
            }).catch(function(error) {
                console.log('共有がキャンセルされたか、失敗しました', error);
            });
        } else {
            // 非対応ブラウザ用のダウンロードフォールバック
            var link = document.createElement("a");
            if (link.download !== undefined) {
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("お使いのブラウザはファイル共有に対応していません。");
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////
    // エラー回避用の空関数（元のコードで未定義のまま呼び出されていたため補足）
    ////////////////////////////////////////////////////////////////////////
    function foo() {
        // 何も処理を行いません。
    }

})()
