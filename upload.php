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
	header('Content-type: application/json');
	
	echo json_encode($model);
	app()->end();
}

if (empty($_FILES)) {
	$data = file_get_contents('php://input');

	$path = '/tmp/' . uniqid() . '.png';

	file_put_contents($path, $data);

	sendAjaxResponse(201, array('url'=>$path)); 

	print_r($data); exit;
} else {
	
	//print_r($_FILES); exit;
	
	$path = '/tmp/' . uniqid() . '.png';

	move_uploaded_file($path, $_FILES['tmp_name']); 
	
	sendAjaxResponse(201, array('url'=>$path));
}