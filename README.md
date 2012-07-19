# Upload


---


## Options

Upload was designed to be as flexible as possible, so below are the possible options.

### Debugging 

* **debug** 			- if debug is true (default), then debug info will be logged to the console

### Queue

* **queue**				- the element that will be used as the queue (div)
* **showQueue**			- if showQueue is set to true, the queue will be shown, if it's false, the queue will be hidden
* **queueOptions**	 	- options for the queue
	* **name** 	 	 		- if set to true, the file name will be shown in the queue
	* **type** 	 	 		- if set to true, the file type will be shown in the queue
	* **size** 	 			- if set to true, the file size will be shown in the queue
	* **lastModified**		- if set to true, the file last modified date will be shown in the queue
	* **progressBar** 		- if set to true, the progress bar will be shown in the queue

### File 

* **fileLimit**			- the number of files that can be uploaded
* **fileType** 			- the mime-type of the files being uploaded (ex. 'image')
* **allowedExts** 		- defaults to null, meaning there is no extension filter (['jpg', 'jpeg', 'png'])
* **multiple** 			- whether or not multiple files can be uploaded with the file input
* **sizeLimit**			- the size limit of the files to upload, 0 is default and means unlimited

### Sending 

* **auto** 				- if auto is true (default), the file will be uploaded as soon as it's added
* **method** 			- the method to use (i.e. 'post' or 'put')
* **action** 			- the action to take, 'upload.php' is default 

### Preview Image 

* **preview**			- the preview container
* **resizeMax**			- the max image size for the preview

### File Input

* **fileInput** 		- the file input selector 
 		
 		<input type="file" name='file' id="files" name="files[]" />
 		
		Given the above input, the fileInput option would look like:
 		
 		fileInput: $('#files') 
 		
	
### Drag and Drop

* **dragDrop** 			- if true (default), then drag and drop is enabled
* **dropZone** 			- this element that will act as the dropzone, must be a div!

 		<div id="dropzone" class="uploadable"></div>
 		
		Given the above input, the dropZone option would look like:
 		
 		dropZone: $('#dropzone') 


* **dropZoneText** 		- 'Drop files here...'
* **dropZoneTextSize** 	- The text size of the dropzone text
* **dzDragOverColor** 	- The background color of the dropzone when the user hovers over it with a file to drop
* **inputFile**			- The file input element for file upload

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