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
		var self   = this;

		/**
		 * The default options 
		 */
		var _defaultOptions = {
			multiple 		 : false,
			queue 			 : null,
			showQueue 		 : true,
			queueOptions	 : {
				name 	 	 : true,
				type 	 	 : true,
				size 	 	 : true,
				lastModified : true	
			},
			auto 	  		 : true,
			debug 	  		 : true,
			dragDrop  		 : true,
			fileType	 	 : 'image',
			allowedExts 	 : null,
			dropZone 		 : null,
			dropZoneText	 : 'Drop files here...',
			inputFile 		 : null,
			dropZoneTextSize : '20px',
			dzDragOverColor  : '#99CCFF',
			sizeLimit		 : 0,
			method 			 : 'post',
			action 			 : 'upload.php',
			onSuccess 		 : function() {},
			onError 		 : function() {},
			beforeSend 		 : function() {}
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
			_debug('in _buildQueue');
			_debug(self.queue);
	
			var output = [];
			
			// loop through the array and build the html
			for (var i = 0, file; file = self.queue[i]; i++) {		  
				
				_debug(file.name);
				
				// Create element
				var li = '<li>';
				
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
				
				li += '</li>';
				
				// Build the output html
				output.push(li);
				
			}
			
			// Set the html in the qeue
			self.options.queue.html('<ul>' + output.join('') + '</ul>');

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
		 * Check if the browser supports FormData, part of XHR Level 2
		 */
		var _checkFileUpload = function() {					
			return (typeof(window.FormData) === 'undefined') 
						? false
						: true;
		};
		
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
			
			// Change background color back to white
			$(this).css('background-color', '#FFF');
			
			// Output debug info
			_debug('dropped');
	
			_ignoreDrag(e);

			var dropZone = self.options.dropZone;
			var dt 		 = e.originalEvent.dataTransfer;
			var files 	 = dt.files;

			if (dt.files.length > 0) {
				var file = dt.files[0];
				self.queue.push(file);
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

			// Output debug info
			_debug(self.options);
			
			// Check if multiple is enabled
			self.options.multiple
				 ? self.element.attr('multiple', 'multiple')
				 : self.element.removeAttr('multiple');
			
			// Check if the browser supports AJAX File upload via XHR Level 2
			self.supportsFileUpload = _checkFileUpload();

			// Initialize the form if an input is attached
			if (self.options.inputFile || self.element.is('input')) 
				_initForm();

			// Initialize drag and drop if a dropzone is attached
			if (self.options.dragDrop || self.element.is('div'))
				_initDragDrop();	
	
		};
		
		/**
		 * Drag and drop
		 */
		var _initDragDrop = function() {
						
			// Set the dropzone
			var dropZone = (self.element.is('div'))
								? self.element
								: self.options.dropZone;

			// Clear html
			dropZone.html('');

			// Build dropzone
			dropZone.append('<span></span>')
				.css('text-align', 'center')
				.css('display', 'table-cell')
				.css('vertical-align', 'middle');
			
			// Check if Drap and Drop is even possible
			if ( _checkFileApi() ) {
				dropZone.find('span')
					.html(self.options.dropZoneText)
					.addClass('dropzone-text')
					.css('color','grey')
					.css('top', '50%');
	
	
				// Add events
				var xhr = new XMLHttpRequest();
				if (xhr.upload) {  
					dropZone.live("dragover", 	_drapOver);  
					dropZone.live("dragleave", 	_drapLeave);  
					dropZone.live("drop", 		_drop);
				};
			} else {
				
				// Drag and Drop is not possible... let them know!
				dropZone.find('span')
					.html('Drag and Drop not supported! <br>Update your browser!!!')
					.addClass('dropzone-text')
					.css('color','white')
					.css('top', '50%');
				dropZone.css('background-color', 'red');
			}
		};
		
		/**
		 * Initialize the form element (i.e. input)
		 */
		var _initForm = function() {
			var inputFile = self.options.inputFile || self.element 
			
			// Bind on change event to the element if it's a form input
			if (inputFile.is('input')) {
				
				inputFile.live('change', function(e) {					
					
					// Check for IE 
					if ($.browser.msie) {
					
						// IE suspends timeouts until after the file dialog closes
						setTimeout(function() {	
							var File = {
								name: self.element.val().split('\\').pop() 
							};				
							
							// Add files to the queue							
							self.queue.push(File);
							
							// Build the queue
							_buildQueueHtml();
							
							// If auto is set, send the request immediately
							if (self.options.auto)
								self.send();
						}, 0);
					} else {
						
						// Add files to the queue
						self.queue = e.target.files; 
							
						// Check if files selected where over the limit or is not set to zero (unlimited)
						if( self.queue.length > self.options.fileLimit && self.options.fileLimit != 0) {
							self.queue = null;
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
		 * Override xhr in $.ajax to attah an onProgress event listener
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
			_debug('successful response');
			
			// TODO: figure out how to get HTTP Status Code 
			
			//_debug(response);
			_debug('iFrame response: ');
			_debug(status);
			_debug(xhr);
			
			//if (status == "error") {
			//	self.options.onError(xhr, status, xhr.statusText);
			//} else {
				content = ($(this).contents().find('body').find('pre').length > 0)
								? $(this).contents().find('body').find('pre').html()
								: $(this).contents().find('body').html();
				
				self.options.onSuccess(content, status, xhr);
			//}
			
			$(this).remove();
		};
		
		/**
		 * Send a file via old iFrame hack since XHR Level 2 is not supported 
		 */
		var _sendFileIframe = function() {
			_debug('in sendFileIframe');
			
			var iframe = $('#upload_frame');
			
			// Append iFrame to the body 
			if ( iframe.length <= 0 ) {
				iframe = $('<iframe/>', {
					name 	: 'upload_frame',
					id 		: 'upload_frame',
					'class'	: 'hidden', 		// Need to use quotes here since it's a Javascript reserved word and IE will choke
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
			if (! self.element.is('input') ) {
				_debug('not an input');
				
				
			} else {
				_debug('is an input');
				
				// Wrap the input in a form if it isn't already
				if (! self.element.isChildOf('form') ) 
					self.element.wrap('<form>');
				
				// Set form attributes
				var form = self.element.closest('form');
				form.attr('action', self.options.action);
				form.attr('target', 'upload_frame');
				form.attr('method', 'post');
				form.attr('enctype', 'multipart/form-data');
				form.attr('encoding', 'multipart/form-data');
				
				form.submit();
			}
		};
		
		/**
		 * Send a file via XHR Level 2 
		 */
		var _sendFileAjax = function() {
					
			// Output debug info
			_debug('in _sendFileAjax');
	
			// Build the formData
			var formData = new FormData();
			$.each(self.queue, function(i, file) {
				formData.append('file-'+i, file);
			});
	
			// Send the AJAX request
			$.ajax({
				url 		: self.options.action,
				type 		: self.options.method.toUpperCase(),
				//xhr 		: Upload.uploadXHR,
				data 		: formData,
				cache 		: false,
				contentType : false,
				processData : false,
				beforeSend  : function(xhr) {
					self.options.beforeSend(xhr);
					var file = self.queue[0];
	
					if (!file)
						_debug('No files in queue');
	
					if (file) {
						if (self.options.method.toUpperCase() == 'PUT') {
							xhr.setRequestHeader('X-File-Name', file.name);
							xhr.setRequestHeader('X-File-Type', file.type);
							xhr.setRequestHeader('X-File-Size', file.size);
							xhr.setRequestHeader('Content-Type', 'application/octet-stream');
						}	
					} 
				},
				success 	: function(data, textStatus, jqXHR) {
					self.options.onSuccess(data, textStatus, jqXHR);
					
					_debug(data);
						
				},
				error 		: function(jqXHR, textStatus, errorThrown) {
					self.options.onError(jqXHR, textStatus, errorThrown);
				}
			});
		};
	
		/**
		 * Clears the queue
		 */
		self.clearQueue = function() {
			var self = this;
	
			_debug('In clearQueue');
			_debug(self.queue);
		
			self.queue = [];
			self.options.queue.html('');
			
			_debug(self.queue);
		};
		
		/**
		 * Send the request
		 *
		 * @param array an array of the files to upload
		 */
		self.send = function() {
			(self.supportsFileUpload)
				? _sendFileAjax()
				: _sendFileIframe();
		}	
		
		
		// Initialize
		_init();
		
	}; // End Upload Class
})(jQuery, window, document);