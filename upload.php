<?

if (empty($_FILES)) {
	$data = file_get_contents('php://input');

	$path = '/tmp/' . uniqid() . '.png';

	file_put_contents($path, $data);

	echo $path; exit; 

	print_r($data); exit;
} else
	print_r($_FILES); exit;