(function($, window, document, undefined) {
	
	/**
	 * Constructor (expose UploadMonkey)
	 *
	 * @param {object} options	The options object
	 * @return {object}			An UploadMonkey object
	 */
	$.fn.UploadMonkey = function(options) {
		return new UploadMonkey(this, options);
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
	
	$.extend($, {
		isJSON: function (data) {
		    try {
		        JSON.parse(data);
		    } catch (e) {
		        return false;
			}
		    return true;
		}
	});
	
	/**
	 * UploadMonkey object
	 *
	 * @param {element} element The DOM element that this plugin is bound to
	 * @param {object} opts		The options object
	 * @return {UploadMonkey}	An UploadMonkey object
	 */
	var UploadMonkey = function(element, opts) {
		var self        = this;
		var progress    = {};
		var clonedInput = null;
		var i           = 0;

		/**
		 * The default options
		 */
		var _defaultOptions = {
				forceIframe			: false,
				fileLimit			: 0,
				multiple			: false,
				queue				: null,
				showQueue			: true,
				queueOptions		: {
					name			: true,
					type			: true,
					size			: true,
					lastModified	: true,
					progressBar		: true
				},
				resizeMax			: null,
				auto				: true,
				debug				: true,
				dragDrop			: true,
				allowedTypes		: null,
				dropZone			: null,
				dropZoneText		: 'Drop files here...',
				fileInput			: null,
				preview				: null,
				defaultTheme		: true,
				dropZoneTextSize	: '20px',
				dzDragOverColor		: '#99CCFF',
				dzDragLeaveColor	: '#FFF',
				sizeLimit			: 0,
				method				: 'post',
				action				: 'upload.php',
				onComplete			: function(response, status, event) {},
				onSuccess			: function(response, status, event) {},
				onError				: function(response, status, error, event) {},
				onProgress			: function(progressBar, percent, event) {},
				beforeSend			: function(data, xhr) {},
				onPreview			: function(file) {}
		};

		/**
		 * Version string
		 */
		self.version = "0.1.0";
		/**
		 * Private data store, containing all of the settings objects
		 */
		self.options = {},
		/**
		 * Private data store, containing all the files to upload
		 */
		self.queue	= [],
		/**
		 * The element that UploadMonkey is bound to
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
		 * Add a file to the queue
		 *
		 * @param {object} file The file object from FileList
		 */
		var _addToQueue = function(file) {

			// Check if the fileLimit has been reached
			if (!_checkFileLimit()) {
				_debug('File limit of ' + self.options.fileLimit + ' has been reached. The queue is full!');
				return;
			}

			// Check file type
			if (_checkFileType(file)) {

				// Add file to the queue
				self.queue.push(file);
				
				// Preview the image, if element is specified
				if (self.options.preview)
					_previewImage(file);
			} else
				_debug('File (' + file.name + ') type ' + file.type + ' is not allowed.  Ignoring the file.');
		};

		/**
		 * Builds the queue
		 *
		 * @param {array} the array of files that were selected
		 */
		var _buildQueueHtml = function() {
			var options = self.options.queueOptions;
			
			// Output debug info
			_debug('Queue: ');
			_debug(self.queue);
			
			var output = [];
			
			// loop through the array and build the html
			for (var i = 0, file; file = self.queue[i]; i++) {
				
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
			
			// Set the html in the queue
			if (self.options.queue)
				self.options.queue.html('<ul id="queue_list">' + output.join('') + '</ul>');
			
			// Set progress bar
			if ( options.progressBar ) {
				
				// Set progress bar for POST
				if ( self.options.method.toUpperCase() === 'POST' ) {
					if (self.options.queue)
						self.options.queue.append($('<progress id="bar_filelist" class="progress-bar" max="100" value="0"></progress>'));
				}
				
				$('ul#queue_list').find('progress')
					.css('margin-left', '7px');
			}

			// Check if the queue should be shown
			if (self.options.queue) {
				self.options.showQueue
					? self.options.queue.show()
					: self.options.queue.hide();
			}
		};
		
		/**
		 * Convert number of bytes into human readable format
		 *
		 * reference: http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
		 *
		 * @param	{integer} bytes     Number of bytes to convert
		 * @param	{integer} precision Number of digits after the decimal separator
		 * @return	{string}		    The human readable string
		 */
		var _bytesToSize = function(bytes, precision) {
			var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			var posttxt = 0;
			
			if (bytes === 0)
				return 'n/a';
			
			while( bytes >= 1024 ) {
				posttxt++;
				bytes = bytes / 1024;
			}
			
			return Number(bytes).toFixed(precision) + " " + sizes[posttxt];
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
		 * Check if the file limit has been reached
		 *
		 * @return {boolean} TRUE if within the fileLimit, FALSE if the limit has been exceeded
		 */
		var _checkFileLimit = function() {
			
			// Check if the number of files selected where over the limit or is set to zero (unlimited)
			if( self.queue.length >= self.options.fileLimit && self.options.fileLimit !== 0)
				return false;
			
			return true;
		};
		
		/**
		 * Check if the browser supports FormData, part of XHR Level 2
		 */
		var _checkFileUpload = function() {
			return (typeof(window.FormData) === 'undefined')
				? false
				: true;
		};

		/**
		 * Checks if the file type is allowed
		 *
		 * @param  {object} $file  The file object from FileList
		 * @return {boolean}       TRUE if the file is allowed, FALSE otherwise
		 */
		var _checkFileType = function(file) {
			if (! self.options.allowedTypes )
				return true;

			// Get allowed types from options
			var types = self.options.allowedTypes.split(',');
			$.each(types, function(i, type) {
				types[i] = $.trim(type);
			});

			// Output debug info
			_debug('Allowed file types: ');
			_debug(types);

			return ($.inArray(file.type, types) > -1)
				? true
				: false;
		};
		
		/**
		 * Output debug info
		 *
		 * @param {mixed} output Whatever you want to output
		 */
		var _debug = function(output) {
			if (self.options.debug)
				console.log(output);
		};
		
		/**
		 * Drag leave
		 *
		 * @param  {event} e The event
		 */
		var _dragLeave = function(e) {
			_ignoreDrag(e);
			
			// Change background color back to white
			$(this).css('background-color', self.options.dzDragLeaveColor);
		};
		
		/**
		 * Drag over
		 *
		 * @param  {event} e The event
		 */
		var _dragOver = function(e) {
			_ignoreDrag(e);
			
			// Change background color
			$(this).css('background-color', self.options.dzDragOverColor);
		};

		/**
		 * Drop event
		 *
		 * @param  {event} e	The event
		 * @return {boolean}	FALSE to preventDefaults and stop bubbling
		 */
		var _drop = function(e) {
			var dropZone = self.options.dropZone;
			
			// Change background color back to white
			self.dropZone.css('background-color', self.options.dzDragLeaveColor);
			
			// Get the dropped file
			var dt		= e.originalEvent.dataTransfer;
			var files	= dt.files;

			if (files.length > 0) {
				if (self.options.multiple) {
					$.each(files, function(i, file) {
						_addToQueue(file);
					});
				} else
					_addToQueue(files[0]);
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
		 *
		 * @param  {event} e	The event
		 * @return {boolean}	FALSE to preventDefaults and stop bubbling
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
			
			// Check if the browser supports AJAX File upload via XHR Level 2
			self.supportsFileUpload = _checkFileUpload();

			// Initialize the form if an input is attached or specified
			if (self.options.fileInput || self.element.is('input'))
				_initForm();

			// Initialize drag and drop if a dropzone is attached or specified
			if ( (self.options.dragDrop && self.options.dropZone !== null) || self.element.is('div'))
				_initDragDrop();
	
		};
		
		/**
		 * Drag and drop
		 *
		 * @param {boolean} isReset Whether or not the callee is reseting
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

			// Build dropzone
			if (!reset) {
				self.dropZone.find('span.dropzone-text').remove();
				self.dropZone.append('<span class="dropzone-text"></span>');
			}

			// Initialize the default theme
			if (self.options.defaultTheme) {
				self.dropZone
					.css('text-align', 'center')
					.css('display', 'table-cell')
					.css('vertical-align', 'middle');
			}
			
			// Check if Drap and Drop is even possible
			if ( _checkFileApi() ) {
				self.dropZone.find('span.dropzone-text')
					.html(self.options.dropZoneText)
					.css('color','grey')
					.css('top', '50%');
	
				// If its a reset then don't attach events
				if (! reset) {
					// Add events
					var xhr = new XMLHttpRequest();
					if (xhr.upload) {
						self.dropZone.on("dragover",	_dragOver);
						self.dropZone.on("dragleave",	_dragLeave);
						self.dropZone.on("drop",		_drop);
					}
				}
			} else {
				
				// Drag and Drop is not possible... let them know!
				self.dropZone.find('span.dropzone-text')
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
			self.fileInput = self.element.is('input')
								? self.element
								: self.options.inputFile;
								
			if (self.options.allowedTypes)
				self.fileInput.attr('accept', self.options.allowedTypes);
			
			// Check if an inputFile is set
			if ( (self.fileInput === null) || !self.fileInput.is('input') )
				_debug('No <input> element found');
			
			// Add custom data attribute (really don't want to do this, but only way I can get a reference after resetting the input
			self.fileInput.addClass('upload-input');
			
			// Check if multiple is enabled
			self.options.multiple
				 ? self.fileInput.attr('multiple', 'multiple')
				 : self.fileInput.removeAttr('multiple');
			
			// Clone the input for later resets
			clonedInput = self.fileInput.outerHtml();
		
			// Bind on change event to the element if it's a form input
			self.fileInput.on('change', function(e) {
				
				// Check for IE
				if ($.browser.msie) {
				
					// IE suspends timeouts until after the file dialog closes
					setTimeout(function() {
						var file = {
							name: self.fileInput.val().split('\\').pop()
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
					
					// Output debug info
					_debug('Selected files: ');
					_debug(e.target.files);
					
					if (!self.options.multiple)
						_debug('Selecting multiple files is disabled.');
					
					// Add files to the queue
					$.each(e.target.files, function(i, file) {
						
						// Stop if the fileLimit has been reached
						if (!_checkFileLimit()) {
							_debug('File limit of ' + self.options.fileLimit + ' has been reached. The queue is full!');
							return false;
						}
						
						// Push file onto the queue
						self.queue.push(file);
						
						// Preview the image, if element is specified
						if (self.options.preview)
							_previewImage(file);
					});
						
				
					// Build the queue
					_buildQueueHtml();

					// If auto is set, send the request immediately
					if (self.options.auto)
						self.send();
				}
			});
		};

		/**
		 * Handle iFrame load
		 */
		var _onIframeOnLoad = function() {
			var data,
				success,
				error,
				status;

			// Get results
			content = ($(this).contents().find('body').find('pre').length > 0)
							? $(this).contents().find('body').find('pre').html()
							: $(this).contents().find('body').html();

			// Handle the response
			if ($.isJSON(content)) {
				data	= $.parseJSON(content);
				success	= data.success.toString();
				error	= (data.error)  ? data.error  : 'Unknown Error';
				status	= (data.status) ? data.status : 'Unknown Status';
			} else {
				try {
					var title	= $(this).contents().find('title').html();
					var regex	= /^\w*\s(.*)$/;
					status		= success = parseInt(title.split(/\b/)[0]);
					error		= regex.exec(title)[1];

					data = {
						response	: title,
						status		: status,
						error		: error
					};
				} catch(e) {
					data = {
						response	: 'Could not parse response',
						status		: 'Unknown Status',
						error		: 'Unknown Error'
					};
				}
			}

			// Check if the response could be parsed
			if (data !== null) {
					
				// If the request was a succes, call onSuccess
				(data.success)
					? self.options.onSuccess(data, status, {})
					: self.options.onError(data, status, error, {});
					
				// Always call onComplete
				self.options.onComplete(data, success);
			} else
				_debug('Could not parse the response.');
			
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
				var result		= e.target.result;
				var fileType	= e.target.result;
				var tag;

				if (result !== null) {
				
					var preview = self.options.preview;
					
					// Create the image/swf
					if (file.type == 'application/x-shockwave-flash') {
						tag = $('<embed\>');
						tag.attr('wmode', 'transparent');
					} else {
						tag	= $('<img\>');
						tag.attr('alt', ' ');
					}

					// Set the source
					tag.attr('src', result);

					// Resize the image if specified in the options
					if (self.options.resizeMax !== null) {
						tag.load(function() {
							_resizeImage(this);
						});
					}
		
					// Add image to the preview element
					preview.append(tag);
				}
			};
			self.options.onPreview(file);
		};
		
		/**
		 * Resize an image keeping the aspect ratio
		 *
		 * @param object the image to resize
		 */
		var _resizeImage = function(image) {
			var max_size = self.options.resizeMax;
			
			// Set the height
			var h = (image.height > image.width)
						? max_size
						: Math.ceil(image.height / image.width * max_size);
			
			// Set the width
			var w = (image.height > image.width)
						? Math.ceil(image.width / image.height * max_size)
						: max_size;
			
			// Apply the resize via CSS
			$(image).css({ height: h, width: w });
		};
		
		/**
		 * Send a file via old iFrame hack since XHR Level 2 is not supported
		 */
		var _sendFileIframe = function() {
			var iframe;
			
			// Output debug info
			_debug('Falling back to iFrame hack!');
			
			// Recursively build the iFrame if one already exists
			(function buildIframe(index) {
				
				// Set the id
				var id = (index > 0)
							? 'upload_frame_' + index
							: 'upload_frame';

				// Check if there is already an iFrame with ID upload_frame
				iframe = $('iframe#'+id);
				
				// Append iFrame to the body
				if ( iframe.length <= 0 ) {
					iframe = $('<iframe/>', {
						name	: id,
						id		: id ,
						'class'	: 'hidden', // Need to use quotes here since it's a Javascript reserved word and of course IE will choke
						src		: '',
						width	: 0,
						height	: 0,
						border	: 0
					}).appendTo($(document).find('body'));
					
					// Hide iFrame
					iframe.css('display', 'none');
					
					// Add event handler
					iframe.one('load', _onIframeOnLoad);
				} else {
					_debug('iFrame with id "' + id + '" already exists');
					buildIframe(++index);
				}
			})(0);
							
			// Wrap the input in a form if it isn't already
			if (! self.fileInput.isChildOf('form') )
				self.fileInput.wrap('<form>');
			
			// Set form attributes
			var form = self.fileInput.closest('form');
			form.attr('action',		self.options.action);
			form.attr('target',		iframe.attr('id'));
			form.attr('method',		'post');
			form.attr('enctype',	'multipart/form-data');
			form.attr('encoding',	'multipart/form-data');

			// Submit the form
			form.submit();
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
			var progressBar = $('progress#' + progressName);
	
			// Show the progress bar
			if (progressBar)
				progressBar.show();
			
			// Create request
			var xhr = new XMLHttpRequest();
			
			// Upload progress listener
			xhr.upload.addEventListener("progress", function(e) {
					
				if (!e.lengthComputable)
					self.options.onProgress(null, null, 'Unable to compute progress.');
					
				var loaded	= e.position  || e.loaded;
				var total	= e.totalSize || e.total;
				var percent	= Math.round( loaded * 100 / total);
				
				// Update the progress bar
				if (progressBar)
					progressBar.val(percent);
					
				// Send back the progress
				self.options.onProgress(progressBar, percent, e);
			}, false);
			
			// On success listener
			xhr.addEventListener("load",  function(e) {
				
				// Clear the queue
				self.queue.length = 0;

				// Reinitaliaze the dropzone
				if (self.dropZone)
					_initDragDrop(true);
						
				// Call onSuccess/onError (Have to do this check, for some reason 'error' event doesn't get raised in every browser)
				( (xhr.status >= 200) && (xhr.status < 300) )
					? self.options.onSuccess(e.target.response, e.target.status, e)
					: self.options.onError(e.target.response, e.target.status, e.target.statusText, e);
				
				// Always call onComplete
				self.options.onComplete(e.target.response, e.target.status, e);
			}, false);
			
			// On error listener
			xhr.addEventListener("error", function(e) {

				// Clear the queue
				self.queue.length = 0;
					
				// Call onError
				self.options.onError(e.target.response, e.target.status, e.target.statusText, e);
				
				// Always call onComplete
				self.options.onComplete(e.target.response, e.target.status, e);
			}, false);
			
			// Open the request
			xhr.open(self.options.method.toUpperCase(), self.options.action);

			// Don't cache requests
			xhr.setRequestHeader("Cache-Control", "no-cache");
			
			// Set headers if the method is PUT
			if (self.options.method.toUpperCase() === 'PUT') {
				if (data.name)
					xhr.setRequestHeader('X-File-Name', data.name);
			}
			
			// Allow beforeSend
			self.options.beforeSend(data, xhr);
			
			// Send the request
			xhr.send(data);
		};
		
		/**
		 * Resets the queue, input and dropzone
		 */
		self.reset = function() {
			
			// Reset the queue
			self.resetQueue();
			
			// Clear the preview
			self.resetPreview();
			
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
			if (self.fileInput !== null)
				self.fileInput.replaceWith(clonedInput);	// Have to replace the input since it's read-only
			
			// Reset the inputFile
			self.fileInput = $('input.upload-input');
									
			// Output debug info
			_debug('Input Reset');
		};
		
		/**
		 * Resets the queue
		 */
		self.resetQueue = function() {
			
			// Clear the queue
			self.queue.length = 0;
			if (self.options.queue)
				self.options.queue.html('');
			
			// Output debug info
			_debug('Queue reset');
			_debug('Queue: ');
			_debug(self.queue);
		};
		
		/**
		 * Reset the preview
		 */
		self.resetPreview = function() {
			
			if (self.options.preview)
				self.options.preview.html('');
			
			// Output debug info
			_debug('Preview Cleared');
		};
		
		/**
		 * Show the queue
		 */
		self.getQueue = function() {
			
			// Output debug info
			_debug('Queue: ');
			_debug(self.queue);
		};

		/**
		 * Hide the dropzone text (i.e. <span class="dropzone-text">)
		 */
		self.hideDzText = function() {
			self.dropZone.find('span.dropzone-text').hide();
			
			// Output debug info
			_debug('Dropzone text removed');
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

			if (self.dropZone)
				self.dropZone.find('span.dropzone-text').html('Loading...');
			
			// Send the request
			(self.supportsFileUpload && !self.options.forceIframe)
				? _sendFileAjax()
				: _sendFileIframe();
		};

		/**
		 * Show the dropzone text (i.e. <span class="dropzone-text">)
		 */
		self.showDzText = function() {
			self.dropZone.find('span.dropzone-text').show();
			
			// Output debug info
			_debug('Dropzone text removed');
		};
		
		// Initialize
		_init();
		
	}; // End UploadMonkey Class
})(jQuery, window, document);
