<?PHP
function pass_chk($pass1,$pass2) {
    if($pass1 === $pass2) {
        $kekka = "OK";
    } else {
        $kekka = "NG";
    }
    echo $pass2."は".$kekka."です。";
    return $kekka;
}
?>

<?php
	if(isset($_POST['delete_ID'])) {
        $delete_pass = "0000";
        $input_pass = $_POST['input_pass'];
        $kekka = pass_chk($delete_pass,$input_pass);
        if($kekka == "OK"){
        	echo "削除実行";
        }else{
        	echo "削除キャンセル";
        }
	}
?>

<!DOCTYPE html>
<html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>自作関数テスト5</title>
    </head>
    <body>
		<form action='' method='post'>
			<p><input type='hidden' name='delete_ID'></p>
			<p><input type='text' name='input_pass' value = ''></p>
			<p><input type='submit' value='削除' onclick="return confirm('削除してよろしいですか？')"></p>
		</form>
    </body>
</html> 
