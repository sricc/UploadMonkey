<?

/**
 * Sends an AJAX response
 *
 * @return object the AJAX data object
 */
function sendAjaxResponse($code, $model) {
	$message = array(
		'200' => 'OK',
		'201' => 'CREATED',
		'400' => 'BAD REQUEST',
		'401' => 'UNAUTHORIZED',
		'403' => 'FORBIDDEN',
		'404' => 'NOT FOUND',
		'500' => 'INTERNAL SERVER ERROR',
		'501' => 'NOT IMPLEMENTED',
	);
	
	header('HTTP/1.1 ' . $code . ' ' . $message[$code]);
	header('Content-type: text/html');
	
	echo json_encode($model);
	exit;
}

/**
 * Get the file extension
 */
function getFileExt($path) {
	$info = pathinfo($path);
	return isset($info['extension'])
				? '.' . $info['extension']
				: NULL;
}

//sendAjaxResponse(500, 'Error');

$tmp_dir = '/tmp/images';

if(!file_exists($tmp_dir)) 
	mkdir($tmp_dir, 0777, true);


if (empty($_FILES)) {
	$data = file_get_contents('php://input');

	$filename = (isset($_SERVER['HTTP_X_FILE_NAME']) ? $_SERVER['HTTP_X_FILE_NAME'] : false);

	if ($filename) {
		$ext = getFileExt($filename); 
		
		$path = $tmp_dir . '/' . uniqid() . $ext;
	
		echo $data; exit;	

		file_put_contents($path, $data);
	
		sendAjaxResponse(201, array('url'=>$path)); 
	}
} else {
	$response = array();
	$error 	  = array();
	
	//print_r($_FILES); exit;

	foreach ($_FILES as $key=>$value) {
		$path = $tmp_dir . '/' . uniqid() . '.png';
		
		//echo $_FILES[$key]['tmp_name'];
	
		if (!is_writeable($tmp_dir)) {
			echo "$tmp_dir not writeable\n";
			exit;
		}
		
		if ($_FILES[$key]['error'] == UPLOAD_ERR_OK) {
			move_uploaded_file($_FILES[$key]['tmp_name'], $path)
				? array_push($response, array('url'=>$path))
				: array_push($error, array('message'=>'Error saving file: ' . $_FILES[$key]['name']));
		}
	}
	
	(empty($error)) 
		? sendAjaxResponse(201, array('url'=>$path))
		: sendAjaxResponse(500, array('error'=>$error));
}