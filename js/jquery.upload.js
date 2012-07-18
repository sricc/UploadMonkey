(function($, window, document, undefined) {
	
	/**
	 * Constructor (expose Upload)
	 *
	 * @param object the options object
	 * @return object the plugin object
	 */
	$.fn.Upload = function(options) {
		return new Upload(this, options);
	};
	
	/**
	 * Extend jQuery to add custom methods
	 */ 
	$.extend($.fn, {
		isChildOf:  function(parent) {
			return $(this).parents().filter(parent).length>0;
		},
		outerHtml: function() {
			return $(this).clone().wrap('<div>').parent().html();	
		}
	});
	
	
	/**
	 * Upload object 
	 *
	 * @param DOM element the DOM element that this plugin is bound to
	 * @param object opts the options object
	 * @return Upload object
	 */
	var Upload = function(element, opts) {
		var self     	= this;
		var progress 	= {};
		var clonedInput = null; 

		/**
		 * The default options 
		 */
		var _defaultOptions = {
			fileLimit		 : 0,
			multiple 		 : false,
			queue 			 : null,
			showQueue 		 : true,
			queueOptions	 : {
				name 	 	 : true,
				type 	 	 : true,
				size 	 	 : true,
				lastModified : true,
				progressBar	 : true
			},
			auto 	  		 : true,
			debug 	  		 : true,
			dragDrop  		 : true,
			fileType	 	 : 'image',
			allowedExts 	 : null,
			dropZone 		 : null,
			dropZoneText	 : 'Drop files here...',
			fileInput 		 : null,
			preview 		 : null,
			dropZoneTextSize : '20px',
			dzDragOverColor  : '#99CCFF',
			sizeLimit		 : 0,
			method 			 : 'post',
			action 			 : 'upload.php',
			onComplete		 : function(jqXHR, textStatus) {},
			onSuccess 		 : function(data, textStatus, jqXHR) {},
			onError 		 : function(jqXHR, textStatus, errorThrown) {},
			onCancelled 	 : function() {},
			onProgress 	 	 : function(percent, xhr) {},
			beforeSend 		 : function(xhr) {}
		};

		/**
		 * Version string
		 */
		self.version = "0.0.1";
		/**
		 * Private data store, containing all of the settings objects 
		 */
		self.options = {},
		/**
		 * Private data store, containing all the files to upload
		 */
		self.queue 	= [],
		/**
		 * The element that Upload is bound to
		 */
		self.element = null;
		/**
		 * The file input element 
		 */
		self.fileInput = null;
		/**
		 * The dropzone element 
		 */
		self.dropZone = null;
		/**
		 * Whether or not the browser supports HTML5 File API
		 */
		self.supportsFileUpload = true;

		// Set the options
		self.options = $.extend(_defaultOptions, opts || {});

		// Set the element that this plugin is bound to
  		self.element = element;

		/**
	 	 * Builds the queue
	 	 *
	 	 * @param array the array of files that were selected
	 	 */
		var _buildQueueHtml = function() {
			var options = self.options.queueOptions;
			
			// Output debug info
			_debug('Queue: ');
			_debug(self.queue);
	
			var output = [];
			
			// loop through the array and build the html
			for (var i = 0, file; file = self.queue[i]; i++) {		  
				
				_debug(file.name);
				
				// Create element
				var li = '<li><span>';
				
				// Build options
				if (options.name)
					li += '<strong>' + escape(file.name) + '</strong>';
				
				// Don't have the rest of the info if IE<10 (IE sucks!!!)
				if (! $.browser.msie ) {
				
					if (options.type)
						li += ' ' + file.type + ' ';
						
					if (options.size)
						li += ' ' + _bytesToSize(file.size, 2);
					
					if (options.lastModified)
						li += (file.lastModifiedDate)
							? ' ' + file.lastModifiedDate.toLocaleDateString()
							: ' n/a';
				}
				
				li += '</span>';
				
				// Set progress bar for PUT
				if ( options.progressBar && (self.options.method.toUpperCase() === 'PUT') )
					li += '<progress id="bar_' + i + '" class="progress-bar" max="100" value="0"></progress>';
				
				li += '</li>';
				
				// Build the output html
				output.push(li);
				
			}
			
			// Set the html in the qeue
			self.options.queue.html('<ul id="queue_list">' + output.join('') + '</ul>');
			
			// Set progress bar 
			if ( options.progressBar ) {
				
				// Set progress bar for POST
				if ( self.options.method.toUpperCase() === 'POST' ) 				
					self.options.queue.append($('<progress id="bar_filelist" class="progress-bar" max="100" value="0"></progress>'));
				
				$('#queue_list').find('progress')
					//.css('display', 'none')
					.css('margin-left', '7px');
			}

			// Check if the queue should be shown	
			self.options.showQueue
				? self.options.queue.show()
				: self.options.queue.hide();
		
		};	
		
		/**
		 * Convert number of bytes into human readable format
		 *
		 * reference: http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
		 *
		 * @param integer bytes     Number of bytes to convert
		 * @param integer precision Number of digits after the decimal separator
		 * @return string
		 */
		var _bytesToSize = function(bytes, precision) {  			
			var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			var posttxt = 0;
			
			if (bytes == 0) 
				return 'n/a';
			
			while( bytes >= 1024 ) {
				posttxt++;
				bytes = bytes / 1024;
			}
			
			return Number(bytes).toFixed(precision) + " " + sizes[posttxt];
		}
		
		/**
		 * Check if the browser supports HTML5 File API
		 */
		var _checkFileApi = function() {	
			return (typeof FileReader === "undefined") 
						? false
						: true;
		};
		
		/**
		 * Output debug info
		 *
		 * @param mixed output whatever you want to output
		 */
		var _debug = function(output) {
			if (self.options.debug)
				console.log(output);
		};
		
		/**
		 * Drag leave
		 */
		var _drapLeave = function(e) {
			_ignoreDrag(e);
			
			// Change background color back to white
			$(this).css('background-color', '#FFF');
		}
		
		/**
		 * Drag over
		 */
		var _drapOver = function(e) {
			_ignoreDrag(e);
			
			// Change background color 
			$(this).css('background-color', self.options.dzDragOverColor);
		}

		/**
		 * Drop event
		 */
		var _drop = function(e) {
			var dropZone = self.options.dropZone;
			
			// Change background color back to white
			$(this).css('background-color', '#FFF');
			
			// Get the dropped file
			var dt 		 = e.originalEvent.dataTransfer;
			var files 	 = dt.files;

			if (files.length > 0) {
				$.each(files, function(i, file) {
									
					// Add file to the queue
					self.queue.push(file);
					
					// Preview the image, if element is specified
					if (self.options.preview)
						_previewImage(file);
				});
			}

			// Build the queue
		   	_buildQueueHtml();
				
			// If options.auto is set, upload the file instantly
			if (self.options.auto)
				self.send();

			return false;
		};
		
		/**
		 * Ignore the drag events
		 */
		var _ignoreDrag = function(e) {
			e.stopPropagation();  
		    e.preventDefault();  

		    return false; // Needed for IE, of course
		};

		/**
		 * Initialize
		 */
		var _init = function() {

			// Ensure that only one file input is being assigned
			if (self.options.inputFile && self.element.is('input')) {
				_debug('Can not attach to an input and specify an input. Please choose one!');
				return;
			}
			
			// Ensure that only one dropzone is being assigned
			if ((self.options.dragDrop && self.options.dropZone !== null) && self.element.is('div')) {
				_debug('Can not attach to a dropzone and specify a dropzone. Please choose one!');
				return;
			}

			// Output debug info
			_debug('Options: ');
			_debug(self.options);
			
			// Check if multiple is enabled
			self.options.multiple
				 ? self.element.attr('multiple', 'multiple')
				 : self.element.removeAttr('multiple');
			
			// Check if the browser supports AJAX File upload via XHR Level 2
			self.supportsFileUpload = $.support.ajax;

			// Initialize the form if an input is attached or specified
			if (self.options.fileInput || self.element.is('input')) 
				_initForm();

			// Initialize drag and drop if a dropzone is attached or specified
			if ( (self.options.dragDrop && self.options.dropZone !== null) || self.element.is('div'))
				_initDragDrop();	
	
		};
		
		/**
		 * Drag and drop
		 */
		var _initDragDrop = function(isReset) {
			var reset = isReset || false;			
						
			// Set the dropzone
			self.dropZone = (self.element.is('div'))
								? self.element
								: self.options.dropZone;
			
			// Check if a dropzone was specified or if we are attached to a div
			if (!self.dropZone) { 
				_debug('No dropZone specified, can not initialize.');
				return;
			}

			// Clear html
			self.dropZone.html('');

			// Build dropzone
			self.dropZone.append('<span></span>')
				.css('text-align', 'center')
				.css('display', 'table-cell')
				.css('vertical-align', 'middle');
			
			// Check if Drap and Drop is even possible
			if ( _checkFileApi() ) {
				self.dropZone.find('span')
					.html(self.options.dropZoneText)
					.addClass('dropzone-text')
					.css('color','grey')
					.css('top', '50%');
	
				if (! reset) {
					// Add events
					var xhr = new XMLHttpRequest();
					if (xhr.upload) {  
						self.dropZone.live("dragover", 	_drapOver);  
						self.dropZone.live("dragleave",	_drapLeave);  
						self.dropZone.live("drop", 		_drop);
					};
				}
			} else {
				
				// Drag and Drop is not possible... let them know!
				self.dropZone.find('span')
					.html('Drag and Drop not supported! <br>Update your browser!!!')
					.addClass('dropzone-text')
					.css('color','white')
					.css('top', '50%');
				self.dropZone.css('background-color', 'red');
			}
		};
		
		/**
		 * Initialize the form element (i.e. input)
		 */
		var _initForm = function() {
			
			// Determine which input to use
			self.inputFile = self.element.is('input')
								? self.element
								: self.options.inputFile;
			
			// Clone the input for later resets
			clonedInput = self.inputFile.clone(true, true);
			
			if ( self.inputFile == null )
				_debug('No <input> element found');
			
			// Bind on change event to the element if it's a form input
			if ( self.inputFile.is('input') ) {
				
				self.inputFile.live('change', function(e) {
					
					// Check for IE 
					
					if ($.browser.msie) {
					
						// IE suspends timeouts until after the file dialog closes
						setTimeout(function() {	
							var file = {
								name: self.inputFile.val().split('\\').pop() 
							};				
							
							// Add files to the queue							
							self.queue.push(file);
							
							// Preview the image, if element is specified
							if (self.options.preview)
								_previewImage(file);
							
							// Build the queue
							_buildQueueHtml();
							
							// If auto is set, send the request immediately
							if (self.options.auto)
								self.send();
						}, 0);
					} else {
						
						_debug(e.target.files);
						
						// Add files to the queue
						$.each(e.target.files, function(i, file) {							
							self.queue.push(file);
							
							// Preview the image, if element is specified
							if (self.options.preview)
								_previewImage(file);
						});
							
						// Check if the number of files selected where over the limit or is set to zero (unlimited)
						if( self.queue.length > self.options.fileLimit && self.options.fileLimit != 0) {
							self.resetQueue();
							alert('File limit is ' + self.options.fileLimit);
							return false;
						}
					
						// Build the queue
						_buildQueueHtml();
	
						// If auto is set, send the request immediately
						if (self.options.auto)
							self.send();
					}
				});	
				
			}
				
		}

		/**
		 * Override xhr in $.ajax to attach an onProgress event listener
		 *
		 * @return object the xhr object
	 	 */
		var _uploadXHR = function() {
			
			// Output debug info
			_debug('in uploadXHR');

			var xhr = $.ajaxSettings.xhr();

	        if(xhr.upload){
	        	if (self.options.onProgress && $.isFunction(self.options.onProgress))
	            	xhr.self.addEventListener('progress', self.options.onProgress, false);
	        }
	        return xhr;
	    };
		
		/**
		 * Handle iFrame load
		 */
		var _onIframeOnLoad = function(response, status, xhr) {
				
			// Get results	
			content = ($(this).contents().find('body').find('pre').length > 0)
							? $(this).contents().find('body').find('pre').html()
							: $(this).contents().find('body').html();
			
			// Parse the JSON repsonse
			var data = $.parseJSON(content);
			
			// Check if the response could be parsed
			if ((data !== null)) {
					
				// If the request was a succes, call onSuccess	
				(data.success)
					? self.options.onSuccess(data, data.success.toString())
					: self.options.onError(data, data.success.toString());
					
				// Always call onComplete
				self.options.onComplete(data, data.success.toString());
			} else
				_debug('Response was not valid JSON');
			
			// Remove the iFrame
			$(this).remove();
		};
		
		/**
		 * Preview the image
		 *
		 * @param file the file to preview
		 */
		var _previewImage = function(file) {
			
			// Check if the HTML5 File API is supported
			if (! _checkFileApi() ) {
				_debug('Browser does not support HTML5 File API');
				return;
			}
			
			var reader  = new FileReader(),
				dataUlr = reader.readAsDataURL(file);
				
			reader.onloadend = function(e) {
				var result = e.target.result;
				
				if (result !== null) {
				
					var preview = self.options.preview;
					preview.attr('class', 'file-preview');
					
					// Create the image
					var image 	= $('<img\>');
					image.attr('src', result);
					image.attr('alt', '');
						
					// Add image to the preview element	
					preview.append(image);	
				}	
			}
		};
		
		/**
		 * Send a file via old iFrame hack since XHR Level 2 is not supported 
		 */
		var _sendFileIframe = function() {
			
			// Output debug info
			_debug('Can not use normal input, falling back to iFrame hack!');
			
			// Check if there is already an iFrame with ID upload_frame
			var iframe = $('#upload_frame');
			
			// Append iFrame to the body 
			if ( iframe.length <= 0 ) {
				iframe = $('<iframe/>', {
					name 	: 'upload_frame',
					id 		: 'upload_frame',
					'class'	: 'hidden', 		// Need to use quotes here since it's a Javascript reserved word and IE will choke
					src  	: '',
					width	: 0, 
					height	: 0,
					border	: 0
				}).appendTo($(document).find('body'));
				
				// Hide iFrame
				iframe.css('display', 'none');
				
				// Add event handler
				iframe.one('load', _onIframeOnLoad);
			} 
			
			
			// Setup the form
			if ( self.inputFile !== null) {
							
				// Wrap the input in a form if it isn't already
				if (! self.inputFile.isChildOf('form') ) 
					self.inputFile.wrap('<form>');
				
				// Set form attributes
				var form = input.closest('form');
				form.attr('action',		self.options.action);
				form.attr('target', 	'upload_frame');
				form.attr('method', 	'post');
				form.attr('enctype', 	'multipart/form-data');
				form.attr('encoding', 	'multipart/form-data');
	
				// Submit the form
				form.submit();
			}
		};
		
		/**
		 * Send a file via XHR Level 2 
		 */
		var _sendFileAjax = function() {
								
			// Build the formData
			var formData = new FormData();
			$.each(self.queue, function(i, file) {
				formData.append('file-'+i, file);				
				
				// If PUT, send each file separately
				if (self.options.method.toUpperCase() === 'PUT') 
					_sendXHR(file, i);
			});
			
			// If POST, send the entire filelist at once
			if (self.options.method.toUpperCase() === 'POST') 
				_sendXHR(formData);
		};
		
		/**
		 * Make the XHR request
		 *
		 * @param file/filelist data the file or filelist to send
		 * @param integer index the queue index of the file to send if it's a file (OPTIONAL)
		 */
		var _sendXHR = function(data, index) {
			
			// If PUT ensure that an index was passed in
			if ( (self.options.method.toUpperCase() === 'PUT') && (typeof index === 'undefined') ) 
				_debug('PUT request requires queue index, progressBar will not work!');
			
			
			// Set the progress bar name
			var progressName = ( (self.options.method.toUpperCase() === 'PUT') && (typeof index !== 'undefined') )
									? 'bar_' + index
									: 'bar_filelist';
			
			// Select the element
			var progressBar = $('#' + progressName);
	
			// Show the progress bar
			if (progressBar)
				progressBar.show();
			
			// Create request
			var xhr = new XMLHttpRequest();
			
			// Upload progress listener
			xhr.upload.addEventListener("progress", function(e) {
				
				_debug(e);	
					
				if (!e.lengthComputable) 
					self.options.onProgress('Unable to compute progress.');	
					
				var loaded  	= e.position  || e.loaded;
				var total   	= e.totalSize || e.total;	
				var percent 	= Math.round( loaded * 100 / total);			
				
				// Update the progress bar
				if (progressBar)
					progressBar.val(percent);
					
				// Send back the progress	
				self.options.onProgress(progressName, percent, e);				
			}, false);
			
			// On success listener
			xhr.addEventListener("load",  function(e) {
				
				// Clear the queue
				self.queue.length = 0;
								
				self.options.onSuccess(e.target.response, e.target.status, e);
			}, false);
			
			// On error listener
			xhr.addEventListener("error", function(e) {		
				
				// Clear the queue
				self.queue.length = 0;
					
				self.options.onError(e.target.response, e.target.status, e);
			}, false);
			
			// Open the request		
			xhr.open(self.options.method.toUpperCase(), self.options.action);
			
			// Set headers if the method is PUT
			if (self.options.method.toUpperCase() === 'PUT') {
				if (data.name)
					xhr.setRequestHeader('X-File-Name', data.name);
			}
			
			// Allow beforeSend
			self.options.beforeSend(data);
			
			// Send the request
			xhr.send(data);
		};
		
		/**
		 * Clear the preview
		 */
		self.clearPreview = function() {
			
			if (self.options.preview)
				self.options.preview.html('');			
			
			// Output debug info
			_debug('Preview Cleared');
		};
		
		/**
		 * Resets the queue, input and dropzone
		 */
		self.reset = function() {
			
			// Reset the queue
			self.resetQueue();
			
			// Clear the preview
			self.clearPreview();
			
			// Reset the dropzone
			self.resetDropzone();
			
			// Reset the input
			self.resetInput();
			
			// Output debug info
			_debug('Reset');	
		};
		
		/**
		 * Resets the dropzone
		 */
		self.resetDropzone = function() {
			
			// Reset the dropzone
			_initDragDrop(true);
			
			// Output debug info
			_debug('Dropzone Reset');
		};
		
		/**
		 * Resets the input
		 */
		self.resetInput = function() {
						
			// Clear the input if we are attached or if one is specified
			if (self.inputFile != null) 
				self.inputFile.replaceWith(clonedInput);	// Have to replace the input since it's read-only
						
			// Output debug info
			_debug('Input Reset');
		};
		
		/**
		 * Resets the queue
		 */
		self.resetQueue = function() {
			
			// Clear the queue
			self.queue.length = 0;
			self.options.queue.html('');
			
			// Output debug info
			_debug('Queue reset');
			_debug('Queue: ')
			_debug(self.queue);
		};
		
		/**
		 * Show the queue
		 */
		self.getQueue = function() {
			
			// Output debug info
			_debug('Queue: ')
			_debug(self.queue);
		};
		
		/**
		 * Send the request
		 *
		 * @param array an array of the files to upload
		 */
		self.send = function() {
			
			// Check if there are any files to upload
			if(self.queue.length <= 0) {
				_debug('No files to upload');
				return;
			}
			
			// Send the request
			(self.supportsFileUpload)
				? _sendFileAjax()
				: _sendFileIframe();
		};	
		
		// Initialize
		_init();
		
	}; // End Upload Class
})(jQuery, window, document);