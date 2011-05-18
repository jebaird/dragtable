/*!
 * dragtable - jquery ui widget to re-order table columns 
 * version 3.0
 * 
 * Copyright (c) 2010, Jesse Baird <jebaird@gmail.com>
 * 12/2/2010
 * https://github.com/jebaird/dragtable
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * 
 * 
 * Forked from https://github.com/akottr/dragtable - Andres Koetter akottr@gmail.com
 * 
 *
 * 
 * 
 * quick down and and dirty on how this works
 * ###########################################
 * so when a column is selected we grab all of the cells in that row and clone append them to a semi copy of the parent table and the 
 * "real" cells get a place holder class witch is removed when the dragstop event is triggered
 * 
 * TODO: 
 * add / create / edit css framework
 * add drag handles
 * click event to handle drag
 * ignore class
 * 
 * 
 * clean up the api - event driven like ui autocompleate
 * make it easy to have a button swap colums
 * 
 */

(function($) {
  $.widget("jb.dragtable", {
  		//TODO: implement this
  		eventWidgetPrefix: 'dragtable',
  		
		options: {
			//used to the col headers, data containted in here is used to set / get the name of the col
			dataHeader:'data-header',
			//handle
			handle:'.dragtable-drag-handle',
			//optional call back used when the col order has changed
			change: $.noop,
			
			//called after we create the drag display allows user to customize the look of the col in drag
			displayHelper: $.noop,
			
			
			//TODO: Faze these out
			// when a col is dragged use this to find the symantic elements, for speed
			tableElemIndex:{  
				head: '0',
				body: '1',
				foot: '2'
			}
		},
				
		_create: function() {
			
			//console.log(this);
			//used start/end of drag
			this.startIndex = null;
			this.endIndex = null;
			this.currentColumnCollection = [];//the refferences to the table cells that are getting dragged
			
			//used on drag event to detect what direction the mouse is moving
			//init on drag start
			this.prevMouseX = 0;
			
			var self = this,
			o = self.options,
			el = self.element;
			
			//grab the ths and the handles and bind them 
			el.delegate('thead th:not( :has(' + o.handle + ')), ' + o.handle, 'mousedown.' + self.widgetEventPrefix, function(e){
				var $handle = $(this);
				//make sure we are working with a th instead of a handle
				if($handle.hasClass(o.handle.replace('.',''))){
					$handle = $handle.closest('th');
				}
				
				var $dragDisplay = self.getCol( $handle.index() );
				//console.log(dragDisplay)
				self._eventHelper('displayHelper',{},{
					'draggable':$dragDisplay
				});
				
                //console.log( el, self );
                
				$dragDisplay
                .focus()
				.disableSelection()
				.css({
					position:'absolute',
                    top: el[0].offsetTop,
                    left: e.pageX
				})
                .appendTo(document.body)
				
                //drag the column around
       
                self.prevMouseX = e.pageX;
                
                $( document )
                .disableSelection()
                .css( 'cursor', 'move')
                .bind('mousemove.' + self.widgetEventPrefix, function( e ){
                    $dragDisplay
                    .css({
    					position:'absolute',
                        left: e.pageX,
                        zindex: 100
				    })
                	
                    var columnPos = self._findElementPosition(self.currentColumnCollection[0]),
					half = self.currentColumnCollection[0].clientWidth / 2;
                    if(e.pageX < self.prevMouseX){
							var threshold = columnPos.x - half;
							if(e.pageX < threshold){
								//console.info('move left');
								self._swapCol(self.startIndex-1);
								self._eventHelper('change',e);
								
							}

						}else{
							var threshold = columnPos.x + half;
							if(e.pageX > threshold){
								//console.info('move right');
								self._swapCol(self.startIndex+1);
								self._eventHelper('change',e);
								
							}
						}
						//update mouse position
						self.prevMouseX = e.pageX;
						
                    
                    
                    
                })
                .one( 'mouseup.dragtable',function(){
                    $( document )
                    .css({
                        cursor: 'auto'
                    })
                    .enableSelection()
                    .unbind( 'mousemove.' + self.widgetEventPrefix );
                    self._dropCol($dragDisplay);
                    self.prevMouseX = 0;
                });
                                
				
				//############
			});
                
		},
		
		_setOption: function(option, value) {
			$.Widget.prototype._setOption.apply( this, arguments );
           
		},
		
		/*
		 * get the selected index cell out of table row
		 * works dam fast
		 */
		_getCells: function( elem, index ){
			var ei = this.options.tableElemIndex,
			
			//TODO: clean up this format 
			tds = {
				'semantic':{
					'0': [],//head throws error if ei.head or ei['head']
					'1': [],//body
					'2': []//footer
				},
				'array':[]
			};
			
			//console.log(index);
			//check does this col exsist
			if(index <= -1 || typeof elem.rows[0].cells[index] == 'undefined'){
				return tds;
			}
			
			for(var i = 0, length = elem.rows.length; i < length; i++){
				var td = elem.rows[i].cells[index];

				tds.array.push(td);
				
				switch(td.parentNode.parentNode.nodeName){
					case 'THEAD':
					case 'thead':
						tds.semantic[ei.head].push(td);
						break;
					case 'TFOOT':
					case 'tfoot':
						tds.semantic[ei.foot].push(td);
						break;
					default:
						tds.semantic[ei.body].push(td);
						break;
				}
		 		
		 	}
		 	
		 	return tds;
		},
		/*
		 * return and array of children excluding text nodes
		 * used only on this.element
		 */
		_getChildren: function(){
			
			var children = this.element[0].childNodes,
			ret = [];
			for(var i = 0, length = children.length; i < length; i++){
				var e = children[i];
				if(e.nodeType == 1){
					ret.push(e);
				}
			}
			
			return ret;
		},
		
		_getElementAttributes: function(element){
			
        	var attrsString = '',
	        attrs = element.attributes;
	        for(var i=0, length = attrs.length; i < length; i++) {
	            attrsString += attrs[i].nodeName + '="' + attrs[i].nodeValue+'"';
	        }
	        return attrsString;
		},
		/*
		 * currently not uses
		 */
		_swapNodes: function(a, b) {
        	var aparent = a.parentNode,
        	asibling = a.nextSibling === b ? a : a.nextSibling;
        	b.parentNode.insertBefore(a, b);
        	aparent.insertBefore(b, asibling);
     	},
     	/*
     	 * faster than swap nodes
     	 * only works if a b parent are the same, works great for colums
     	 */
     	_swapCells: function(a, b) {
        	a.parentNode.insertBefore(b, a);
     	},
     	/*
     	 * use this instead of jquerys offset, in the cases were using is faster than creating a jquery collection
     	 */
		_findElementPosition: function( oElement ) {
			if( typeof( oElement.offsetParent ) != 'undefined' ) {
				for( var posX = 0, posY = 0; oElement; oElement = oElement.offsetParent ) {
					posX += oElement.offsetLeft;
					posY += oElement.offsetTop;
				}
				return {'x':posX, 'y':posY };
			} else {
				return {'x':oElement.x, 'y':oElement.y };
			}
		},
		/*
		 * used to tirgger optional events
		 */
		_eventHelper: function(eventName ,eventObj, additionalData){
			this._trigger( 
				eventName, 
				eventObj, 
				$.extend({
					column: this.currentColumnCollection,
					order: this.order()						
				},additionalData)
			);
		},
		/*
		 * build copy of table and attach the selected col to it, also removes the select col out of the table
		 * @returns copy of table with the selected col
		 */		
		getCol: function(index){
			//console.log('index of col '+index);
			//drag display is just simple html
			//console.profile('selectCol');
			
			//colHeader.addClass('ui-state-disabled')

			var $table = this.element,
			self = this,
			eIndex = self.options.tableElemIndex,
			//BUG: IE thinks that this table is disabled, dont know how that happend
			$dragDisplay = $('<table '+self._getElementAttributes($table[0])+'></table>')
			.addClass('dragtable-drag-col');
			
			//start and end are the same to start out with
			self.startIndex = self.endIndex = index;
		

		 	var cells = self._getCells($table[0], index);
			self.currentColumnCollection = cells.array;
			//console.log(cells);
			//################################
			
			//TODO: convert to for in // its faster than each
			$.each(cells.semantic,function(k,collection){
				//dont bother processing if there is nothing here
				
				if(collection.length == 0){
					return;
				}
                
                if ( k == '0' ){
                    var target = document.createElement('thead');
						$dragDisplay[0].appendChild(target);
						// 
						// var target = $('<thead '+self._getElementAttributes($table.children('thead')[0])+'></thead>')
						// .appendTo($dragDisplay);
                }else{ 
                    var target = document.createElement('tbody');
						$dragDisplay[0].appendChild(target);
						// var target = $('<tbody '+self._getElementAttributes($table.children('tbody')[0])+'></tbody>')
						// .appendTo($dragDisplay);
	

                }

				for(var i = 0,length = collection.length; i < length; i++){
					
					var clone = collection[i].cloneNode(true);
					collection[i].className+=' dragtable-col-placeholder';
					var tr = document.createElement('tr');
					tr.appendChild(clone);
					//console.log(tr);
					
					
					target.appendChild(tr);
					//collection[i]=;
				}
			});
    		// console.log($dragDisplay);
    		//console.profileEnd('selectCol')
            $dragDisplay  = $('<div class="dragtable-drag-wrapper"></div>').append($dragDisplay)
    		return $dragDisplay;
		},
		
		
		/*
		 * move column left or right
		 */
		_swapCol: function( to ){
			
			//cant swap if same postion
			if(to == this.startIndex){
				return false;
			}
			
			from = this.startIndex;
			this.endIndex = to;
			
	        if(from < to) {
	        	//console.log('move right');
	        	for(var i = from; i < to; i++) {
	        		var row2 = this._getCells(this.element[0],i+1);
	        	//	console.log(row2)
	        		for(var j = 0, length = row2.array.length; j < length; j++){
	          			this._swapCells(this.currentColumnCollection[j],row2.array[j]);
	          		}
	          	}
	        } else {
	        	//console.log('move left');
	        	for(var i = from; i > to; i--) {
	            	var row2 = this._getCells(this.element[0],i-1);
	            	for(var j = 0, length = row2.array.length; j < length; j++){
	          			this._swapCells(row2.array[j],this.currentColumnCollection[j]);
	          		}
	        	}
	        }
	        
	        this.startIndex = this.endIndex;
		},
		/*
		 * called when drag start is finished
		 */
		_dropCol: function($dragDisplay){
		//	console.profile('dropCol');
			var self = this;
			
			if($dragDisplay){
				$dragDisplay.remove();
			}
			//remove placeholder class
			for(var i = 0, length = self.currentColumnCollection.length; i < length; i++){
				var td = self.currentColumnCollection[i];
				
				td.className = td.className.replace(' dragtable-col-placeholder','');
			}
			

		},
		/*
		 * get / set the current order of the cols
		 */
		order: function(order){
			var self = this,
			elem = self.element,
			options = self.options,
			headers = elem.find('thead tr:first').children('th');
			
			
			if(order == undefined){
				//get
				var ret = [];
				headers.each(function(){
					var header = this.getAttribute(options.dataHeader);
					if(header == null){
						//the attr is missing so grab the text and use that
						header = $(this).text();
					}
					
					ret.push(header);
					
				});
				
				return ret;
				
			}else{
				//set
				//headers and order have to match up
				if(order.length != headers.length){
					//console.log('length not the same')
					return self;
				}
				for(var i = 0, length = order.length; i < length; i++){
					 
					 var start = headers.filter('['+ options.dataHeader +'='+ order[i] +']').index();
					 if(start != -1){
					 	//console.log('start index '+start+' - swap to '+i);
					 	self.startIndex = start;
					 	
						self.currentColumnCollection = self._getCells(self.element[0], start).array;

					 	self._swapCol(i);
					 }
					 
					 
				}
				self._eventHelper('change',{});
				return self;
			}
		},
				
		destroy: function() {
			var self = this,
			o = self.options;
			this.element.undelegate( 'thead th:not( :has(' + o.handle + ')), ' + o.handle, 'mousedown.' + self.widgetEventPrefix );
            
		}

        
	});

})(jQuery);