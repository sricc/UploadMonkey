(function($, window, undefined) {
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
		var defaultOptions = {
			multiple 		 : false,
			queue			 : false,
			showQueue 		 : true,
			auto 	  		 : true,
			debug 	  		 : true,
			dragDrop  		 : true,
			mimeType		 : 'image',
			allowedExts 	 : null,
			dropZone 		 : null,
			dropZoneText	 : 'drop files here...',
			dropZoneTextSize : '20px',
			sizeLimit		 : 0,
			method 			 : 'post',
			action 			 : 'this.php',
			successStatus 	 : [200,201],
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

		// Set the options
		self.options = $.extend(defaultOptions, opts || {});

		// Output debug info
		if (self.options.debug)
			console.log(self.options);

		// Set the element that this plugin is bound to
  		self.element = element;

		/**
	 	 * Builds the queue
	 	 *
	 	 * @param array the array of files that were selected
	 	 */
		var _buildQueue = function() {
			console.log('in _buildQueue');
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
		}	

		var _dragDrop = function() {
			var dropZone = self.options.dropZone;

			dropZone.append('<span></span>')
				.css('text-align', 'center')
				.css('display', 'table-cell')
				.css('vertical-align', 'middle');
			dropZone.find('span')
				.html(self.options.dropZoneText || 'drop files here...')
				.css('color','grey')
				.css('font-size', self.options.dropZoneTextSize)
				.css('top', '50%')

			var xhr = new XMLHttpRequest();
			if (xhr.upload) {  
		        dropZone.live("dragover", 	_ignoreDrag);  
		        dropZone.live("dragleave", 	_ignoreDrag);  
		        dropZone.live("drop", 		_drop);
			};
		};

		var _ignoreDrag = function(e) {
			e.stopPropagation();  
		    e.preventDefault();  

		    return false; // Needed for IE
		};

		var _drop = function(e) {
			_ignoreDrag(e);

			var dropZone = self.options.dropZone;

			console.log('dropped');
			
			var dt = e.originalEvent.dataTransfer;
			var files = dt.files;

			if(dt.files.length > 0){
				var file = dt.files[0];
				self.files.push(file);
			}

			if (self.options.auto)
				self.send();

			return false;
		};

		/**
		 * Initialize
		 */
		var _init = function() {

			// Check if multiple is enabled
			self.options.multiple
				 ? self.element.attr('multiple', 'multiple')
				 : self.element.removeAttr('multiple');

			// Bind on change event to the element if it's a form input
			if (self.element.is('input')) {
				self.element.live('change', function(e) {
				    self.files = e.target.files; 

				    // Check if files selected where over the limit or is not set to zero (unlimited)
				    if( self.files.length > self.options.fileLimit && self.options.fileLimit != 0) {
				    	self.files = null;
	    				alert('File limit is ' + self.options.fileLimit);
	    				return false;
	    			}

	    			// Build the queue
				   	_buildQueue();

				    // If auto is set, send the request immediately
				    if (self.options.auto)
						self.send();
				});
			}

			if (self.options.dragDrop)
				_dragDrop();	
		};

		/**
		 * Override xhr in $.ajax to attah an onProgress event listener
		 *
		 * @return object the xhr object
	 	 */
		var uploadXHR = function() {
			console.log('in uploadXHR');

			var xhr = $.ajaxSettings.xhr();

	        if(xhr.upload){
	        	if (self.options.onProgress && $.isFunction(self.options.onProgress))
	            	xhr.self.addEventListener('progress', self.options.onProgress, false);
	        }
	        return xhr;
	    }

		_init();	
	};

	/**
	 * Clears the queue
	 */
	Upload.prototype.clearQueue = function() {
		var self = this;

		self.queue = [];
		self.options.queue.html('');
	};

	/**
	 * Send the request
	 *
	 * @param array an array of the files to upload
	 */
	Upload.prototype.send = function() {
		var self = this;
		console.log('in send');

		// Build the formData
		var formData = new FormData();
		formData.append('file', self.files[0]);

		// Send the AJAX request
		$.ajax({
		    url 		: self.options.action,
		    type 		: self.options.method.toUpperCase(),
		    xhr 		: Upload.uploadXHR,
		    data 		: formData,
		    cache 		: false,
		    contentType : false,
		    processData : false,
		    beforeSend : function(xhr) {
		    	self.options.beforeSend(xhr);
		    	var file = self.files[0];

		    	if (self.options.method.toUpperCase() == 'PUT') {
		        	xhr.setRequestHeader('X-File-Name', file.name);
		        	xhr.setRequestHeader('X-File-Type', file.type);
                    xhr.setRequestHeader('X-File-Size', file.size);
		        	xhr.setRequestHeader('Content-Type', 'application/octet-stream');
		        }	
		    },
		    success 	: function(data, textStatus, jqXHR) {
		    	self.options.onSuccess(data, textStatus, jqXHR);
		    },
		    error 		: function(jqXHR, textStatus, errorThrown) {
		    	self.options.onError(jqXHR, textStatus, errorThrown);
		    }
		});
	}

	/**
	 * Constructor (expose Upload)
	 *
	 * @param object the options object
	 * @return object the plugin object
	 */
	$.fn.Upload = function(options) {
		return new Upload(this, options);
	};
})(jQuery, window);