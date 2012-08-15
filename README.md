# Upload Monkey

A simple file upload plugin that permforms POST and PUT XHR Level 2 uploading.  The plugin will fallback to the old iFrame hack if the browser doesn't support XHR (e.g. IE).  If the upload method is set to POST all files will be uploaded as one single request.  If the upload method is set to PUT each file will be uploaded separately.  

---

## Documentation

Check out the [documentation](http://stevericc.github.com/UploadMonkey/) for more information.

---

## Usage

Given a simple html file.

	<html>
	<head>
		<title></title>
	</head>
	<body>
		<div id="dropzone" class="uploadable"></div>

		<input type="file" name='file' id="files" name="files[]" />

		<div id="preview"></div>
		
		<div id="queue"></div>
	</body>
	</html>

You can attach the Upload Monkey plugin multiple ways, but in it's simpiest form just bind it to a file input or drag and drop dropzone.
	
	var upload = $('input#files').UploadMonkey(options);
	
or

	var upload = $('div#dropzone').UploadMonkey(options);

You can also specify a drag and drop dropzone while it is bound to a file input.

	var upload = $('input#files').UploadMonkey({
			dragDrop 		: true,
			dropZone 		: $('div#dropzone'),
			dropZoneText 	: 'Drop files here...',
			action 			: 'http://www.upload.me.com/upload.php',
			}
		});

You can also do the reverse, bind it to a drag and drop dropzone and specify a file input.

	var upload = $('div#dropzone').UploadMonkey({
			fileInput		: $('input#files'),
			dragDrop 		: true,
			dropZoneText 	: 'Drop files here...',
			action 			: 'http://www.upload.me.com/upload.php',
			}
		});

---


## Options

Upload Monkey was designed to be as flexible as possible but still completely functional.

### Debugging 

* **debug** 			- if debug is true (default), then debug info will be logged to the console

### Queue

* **queue**				- the element that will be used as the queue (div)
* **showQueue**			- if showQueue is set to true (default), the queue will be shown, if false, the queue will be hidden
* **queueOptions**	 	- options for the queue
	* **name** 	 	 		- if set to true (default), the file name will be shown in the queue
	* **type** 	 	 		- if set to true (default), the file type will be shown in the queue
	* **size** 	 			- if set to true (default), the file size will be shown in the queue
	* **lastModified**		- if set to true (default), the file last modified date will be shown in the queue
	* **progressBar** 		- if set to true (default), the progress bar will be shown in the queue

### File 

* **fileLimit**			- the number of files that can be uploaded, defaults to 0, meaning unlimited.
* **allowedTypes** 		- defaults to null, meaning there is no type filter (e.g. 'image/jpg, image/jpeg, image/png')
* **multiple** 			- whether or not multiple files can be uploaded with the file input, defaults to false, meaning only file can be uploaded at a time
* **sizeLimit**			- the size limit of the files to upload, 0 is default and means unlimited

### Sending 

* **auto** 				- if auto is true (default), the file will be uploaded as soon as it's added
* **method** 			- the method to use (e.g. 'post' or 'put'), defaults to 'post'
* **action** 			- the action to take, defaults to 'upload.php' 

### Preview Image 

* **preview**			- the preview container
* **resizeMax**			- the max image size for the preview (e.g. '150px')

### File Input

* **fileInput** 		- the file input selector 
 		
 		<input type="file" name='file' id="files" name="files[]" />
 		
		Given the above input, the fileInput option would look like:
 		
 		fileInput: $('input#files') 
 		
	
### Drag and Drop

* **dragDrop** 			- if true (default), then drag and drop is enabled
* **dropZone** 			- this element that will act as the dropzone, must be a div!

 		<div id="dropzone" class="uploadable"></div>
 		
		Given the above input, the dropZone option would look like:
 		
 		dropZone: $('div#dropzone') 


* **dropZoneText** 		- Any string you'd like the dropzone to say, defaults to 'Drop files here…'
* **dropZoneTextSize** 	- The text size of the dropzone text, defaults to '20px'
* **dzDragOverColor** 	- The background color of the dropzone when the user hovers over it with a file to drop, defaults to '#99CCFF'

### Events

* **onComplete**		- callback for when the request is complete (will always be called, regardless of sucess or error)
	* jqXHR - the xhr request
	* textStatus  	
        
        function(jqXHR, textStatus) {}

* **onSuccess** 		- callback for when the request is completed successfully

		function(data, textStatus, jqXHR) {}

* **onError** 			- callback for when the request is completed but there is an error

		function(jqXHR, textStatus, errorThrown) {}

* **onProgress** 		- callback for when the request sends a progress report

		function(progressBarId, percent, xhr) {}

* **beforeSend**		- callback for before the request is sent

		function(xhr) {}
		
## MIT License
------------
Copyright (c) 2012 Steve Ricciardelli

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.