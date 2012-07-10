(function($, window, undefined) {
	
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
	 * Upload object 
	 *
	 * @param DOM element the DOM element that this plugin is bound to
	 * @param object opts the options object
	 * @return Upload object
	 */
	var Upload = function(element, opts) {
		var self = this;

		/**
		 * The default options 
		 */
		var _defaultOptions = {
			multiple 		 : false,
			queue			 : false,
			showQueue 		 : true,
			auto 	  		 : true,
			debug 	  		 : true,
			dragDrop  		 : true,
			mimeType		 : 'image',
			allowedExts 	 : null,
			dropZone 		 : null,
			dropZoneText	 : 'Drop files here...',
			inputFile 		 : null,
			inputText		 : 'Choose File',
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
		 * The files to send
		 */
		self.files = [];
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
		var _buildQueue = function() {
			
			// Output debug info
			_debug('in _buildQueue');
	
			var output = [];

		   	// loop through the array and build the html
		    for (var i = 0, file; file = self.files[i]; i++) {	
				
				// Push the file into the queue
		    	self.queue.push(file);

		    	// Build the output html
		      	output.push('<li><strong>', escape(file.name), '</strong> (', file.type || 'n/a', ') - ',
		                  file.size, ' bytes, last modified: ',
		                  file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a',
		                  '</li>');
		    }
			
			// Set the html in the qeue
			self.options.queue.html('<ul>' + output.join('') + '</ul>');

			// Check if the queue should be shown
			self.options.showQueue
				? self.options.queue.show()
				: self.options.queue.hide();
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

			if(dt.files.length > 0){
				var file = dt.files[0];
				self.files.push(file);
			}

			// Build the queue
		   	if (self.options.queue)
			   	_buildQueue();

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

		    return false; // Needed for IE
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

			if (! _checkFileUpload() )
				self.supportsFileUpload = false;

			if (self.options.inputFile || self.element.is('input')) 
				_initForm();

			if (self.options.dragDrop || self.element.is('div'))
				_initDragDrop();	
		};
		
		/**
		 * Drag and drop
		 */
		var _initDragDrop = function() {
			var dropZone = self.options.dropZone || self.element;

			// Build dropzone
			dropZone.append('<span></span>')
				.css('text-align', 'center')
				.css('display', 'table-cell')
				.css('vertical-align', 'middle');
			dropZone.find('span')
				.html(self.options.dropZoneText)
				.css('color','grey')
				.css('top', '50%');


			// Add events
			var xhr = new XMLHttpRequest();
			if (xhr.upload) {  
		        dropZone.live("dragover", 	_drapOver);  
		        dropZone.live("dragleave", 	_drapLeave);  
		        dropZone.live("drop", 		_drop);
			};
		};
		
		/**
		 * Initialize the form element (i.e. input)
		 */
		var _initForm = function() {
			var inputFile = self.options.inputFile || self.element
			
			// Bind on change event to the element if it's a form input
			if (inputFile.is('input')) {
				inputFile.text(self.options.inputText);
				
				inputFile.live('change', function(e) {
				    self.files = e.target.files; 

				    // Check if files selected where over the limit or is not set to zero (unlimited)
				    if( self.files.length > self.options.fileLimit && self.options.fileLimit != 0) {
				    	self.files = null;
	    				alert('File limit is ' + self.options.fileLimit);
	    				return false;
	    			}

	    			// Build the queue
				   	if (self.options.queue)
						_buildQueue();

				    // If auto is set, send the request immediately
				    if (self.options.auto)
						self.send();
				});
			}	
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
		 * Send a file via old iFrame hack since XHR Level 2 is not supported 
		 */
		var _sendFileIframe = function() {
			_debug('in sendFileIframe');
		};
		
		/**
		 * Send a file via XHR Level 2 
		 */
		var _sendFileAjax = function() {
					
			// Output debug info
			_debug('in _sendFileAjax');
	
			// Build the formData
			var formData = new FormData();
			$.each(self.files, function(i, file) {
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
					var file = self.files[0];
	
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
					
					if (self.options.debug)
						console.log(data);
						
					self.clearFiles();
				},
				error 		: function(jqXHR, textStatus, errorThrown) {
					self.options.onError(jqXHR, textStatus, errorThrown);
					
					self.clearFiles();
				}
			});
		};
	
		/**
		 * Clears the queue
		 */
		self.clearQueue = function() {
			var self = this;
	
			self.queue = [];
			self.options.queue.html('');
		};
		
		/**
		 * Clears the files
		 */
		self.clearFiles = function() {
			var self = this;
	
			self.files = [];
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
})(jQuery, window);