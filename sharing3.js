//Definition global endpoints
var hubItemsURL = "https://medrc.sharepoint.com/sites/MedRecords/ExternalSharing/_api/web/lists/getByTitle('Hub')/rootFolder/Folders?$expand=ListItemAllFields,Destination_x0020_Physician";
var doctorsURL = "https://medrc.sharepoint.com/sites/MedRecords/_api/web/lists/getByTitle('Doctors List')/items?$top=5000";
var doctorsURLExternal = "https://medrc.sharepoint.com/sites/MedRecords/_api/web/lists/getByTitle('Doctors List')/items?$top=5000&$filter=(External_x0020_Site eq 'Yes')";

//Definition of the module
var app = angular.module("hubApp", ['angularMoment', 'ui.toggle', 'ui.bootstrap']);

//Definition of this controller
app.controller("myCtrl", function ($scope, $http, $q, moment, $timeout) {
	//Declaring controllers variables
	const physicians = [];
	$scope.loaderDisplay = false;
	$scope.ddReadonly = false;
	//Function: get all physicians

	$scope.currentPage = 1;
	$scope.begin = 0;
	$scope.end = 0;
	$scope.totalItemOnPage = 10;
	//$scope.listOfId = [];

	//$scope.totalString = "";
	$scope.sorted = -1;
	$scope.searched = 0;

	$scope.nextTuesday = getNextTuesday().format('ddd DD MMM, YYYY');

	function getNextTuesday() {
		const dayINeed = 2;
		const today = moment().utcOffset('-0800').isoWeekday();


		if (today <= dayINeed) {
			return moment().isoWeekday(dayINeed);
		} else {
			return moment().add(1, 'weeks').isoWeekday(dayINeed);
		}
	}

	var getPhysicians = function (url) {
		var dfd = $q.defer();

		getAllItems(url).then(function (r) {
			angular.forEach(r.data.value, function (el, i) {
				physicians.push({
					'id': el.Id,
					'name': el.Title,
					'code': el.o4ml,
					'email': el.External_x0020_Site_x0020_Email,
					'sharedURL': el.External_x0020_Shared_x0020_Link,
					'spSite': el.External_x0020_Site_x0020_URL
				})
			})

			dfd.resolve(r);
		});

		return dfd.promise;
	}

	//Function: Get records from HUB
	var getRecords = function () {
		var dfd = $q.defer();
		const initArr = [];

		//Fn: Get all the patient folders
		getAllItems(hubItemsURL).then(function (r) {
			angular.forEach(r.data.value, function (i) {
				if (i && i.ListItemAllFields) {

					var obj = {
						'Id': i.ListItemAllFields.ID,
						'createdDate': i.TimeCreated,
						'createdTime': i.TimeCreated,
						'folderName': i.Name,
						'folderURL': i.ServerRelativeUrl,
						'folderPaymentStatus': (i.ListItemAllFields.isPaid) ? 'Paid' : 'Unpaid',
						'sourcePhysician': matchFolderNameToPhysician(i.Name),
						'destinationPhysician': matchFolderNameToDestinationPhysician(i.ListItemAllFields.Destination_x0020_PhysicianId),
						'destinationPhysicianEmail': getEmailDestinationPhysician(i.ListItemAllFields.Destination_x0020_PhysicianId),
						'destinationPhysicianLink': getURLDestinationPhysician(i.ListItemAllFields.Destination_x0020_PhysicianId),
						'currentStatus': (i.ListItemAllFields.Current_x0020_Status) ? i.ListItemAllFields.Current_x0020_Status : 'Docked',
						'instantShareBtn': '',
						'accessExpirationDate': i.ListItemAllFields.Access_x0020_expiration_x0020_date,
						'sharedNotes': i.ListItemAllFields.Shared_x0020_Notes,
						'sharedTo': i.ListItemAllFields.SharedTo,
						'externalSite': getSiteDestinationPhysician(i.ListItemAllFields.Destination_x0020_PhysicianId),
						'lastSharedDate': i.ListItemAllFields.LastSharedDate


					}
					initArr.push(obj);
				}
			})
		}).then(function () {
			$scope.items = initArr;
			dfd.resolve($scope.items);
		})

		return dfd.promise;
	}

	// Get string value

	getStringValue = function (el) {
		$scope.totalString = "";
		angular.forEach(el, function (value, i) {
			if (i != "Id") {
				$scope.totalString += value + '##';
			}

		});

	}

	//ONINIT
	//Get all physician to work the match physician source
	getPhysicians(doctorsURL).then(function () {

		//Get the records for the table
		getRecords().then(function () {
			//Run the Datable
			angular.element(document).ready(function () {
				var dTable = $('#hubTable').DataTable({
					"pageLength": 50,
					"select": true,
					"columnDefs": [
						{ "orderable": false, "targets": [0] }
					],
					"order": [[2, "desc"]]
				});
			});
		})
	});

	//Function to populate the control physician dropdowns
	getPhysicians(doctorsURLExternal).then(function (r) {
		$scope.physiciansDropdown = r.data.value;
	})

	//Display the physician destination
	function matchFolderNameToDestinationPhysician(id) {

		var destination = physicians.filter(function (el, i) {
			if (el.id == id) {
				return el;
			}
		});

		if (destination[0]) {
			return destination[0].name
		} else {
			return '';
		}
	}

	//Get email to physician destination
	function getEmailDestinationPhysician(id) {
		var destination = physicians.filter(function (el, i) {
			if (el.id == id) {
				return el;
			}
		});

		if (destination[0]) {
			return destination[0].email
		} else {
			return '';
		}
	}

	function getURLDestinationPhysician(id) {
		var destination = physicians.filter(function (el, i) {
			if (el.id == id) {
				return el;
			}
		});

		if (destination[0]) {
			return destination[0].sharedURL
		} else {
			return '';
		}
	}

	function getSiteDestinationPhysician(id) {
		var destination = physicians.filter(function (el, i) {
			if (el.id == id) {
				return el;
			}
		});

		if (destination[0]) {
			return destination[0].spSite
		} else {
			return '';
		}
	}

	//Matching Name folder to physician
	function matchFolderNameToPhysician(name) {

		//First Get all the physicians
		var regExp = /\(([^)]+)\)/;
		var matches = regExp.exec(name);
		var matchedPhysician = 'No match';

		//If there is a match
		if (matches) {
			var physicianCode = regExp.exec(name)[1];

			var filterPhysician = physicians.filter(function (el, i) {
				if (el.code == physicianCode) {
					return el;
				}
			});

			if (filterPhysician) {
				try {
					matchedPhysician = filterPhysician[0].name;
				}
				catch (err) {
					matchedPhysician = "No match";
				}


			}

		}
		return matchedPhysician;
	}

	//This query all items on a list
	function getAllItems(url) {
		var deferred = $q.defer();
		var request = $http({
			url: url,
			cache: false,
			method: "GET",
			headers: {
				"accept": "application/json"
			}
		});

		request.then(
			function (resp) {
				deferred.resolve(resp);
			},
			function (resp) {
				deferred.reject(resp);
			}
		);
		return deferred.promise;
	}
	//Function to display count
	$scope.checkedCount = function () {
		return $scope.items.filter(function (i) {
			return i.checked;
		}).length;
	}

	//Function for the toggle
	$scope.changed = function () {
	}

	// Fn: Reload page when click button
	function reloadPageAndReconfigureDatatable() {
		if ($.fn.dataTable.isDataTable('#hubTable')) {
			dtable = $('#hubTable').DataTable();
		}

		// Detroy table first
		dtable.destroy();

		// Create new then
		//Run the Datable
		angular.element(document).ready(function () {
			var dTable = $('#hubTable').DataTable({
				//paging: false,
				"pageLength": $scope.totalItemOnPage,
				"retrieve": true,
				"columnDefs": [{ "orderable": false, "targets": [0] }],
				"order": [[2, "desc"]]
			});

			resetCheckAllButton();
		});

		// Reset toggle and dropdown list
		$scope.toggleValue = false;
		$scope.selected = "";
	}

	//Function to get all the records to apply the same source and payment status
	$scope.applyAll = function ($event) {

		//While we do the save operation set the controls to readonly
		// $scope.ddReadonly = true;
		$scope.loaderDisplay = true;

		// Get the payment status current
		var currentPayment = ($scope.toggleValue) ? $scope.toggleValue : false;

		// Get the select physician
		var currentPhysician = ($scope.selected) ? $scope.selected.Id : null;

		//the selected items
		var selectedItems = $scope.items.filter(function (i) {
			return i.checked;
		});

		if (selectedItems) {
			if (currentPhysician && currentPayment) {
				var allPromises = [];
				//Push all of the request for change into the allPromises array
				angular.forEach(selectedItems, function (el, i) {
					allPromises.push(sharePatientRecord(el, 'Schedule Sharing', currentPayment, currentPhysician, false));
				})

				//Run all promises and setup the results
				$q.all(allPromises).then(function (r) {
					getRecords().then(function (r) {
						$scope.loaderDisplay = false;
						reloadPageAndReconfigureDatatable();
					})
				})
			} else {
				var allPromises = [];
				//Push all of the request for change into the allPromises array
				angular.forEach(selectedItems, function (el, i) {
					allPromises.push(sharePatientRecord(el, 'Docked', currentPayment, currentPhysician, true));
				})

				//Run all promises and setup the results
				$q.all(allPromises).then(function (r) {
					getRecords().then(function (r) {
						$scope.loaderDisplay = false;
						reloadPageAndReconfigureDatatable();

					})
				})
			}
		}
	}

	//Function to share 1 patient record
	sharePatientRecord = function (item, status, payment, physician, emptyAccessExpiration) {
		var dfd = $q.defer();
		if (emptyAccessExpiration) {
			var properties = {
				Current_x0020_Status: status,
				isPaid: payment,
				Destination_x0020_PhysicianId: physician,
				Access_x0020_expiration_x0020_date: null
			}
		} else {
			var properties = {
				Current_x0020_Status: status,
				isPaid: payment,
				Destination_x0020_PhysicianId: physician
			}
		}


		$pnp.sp.web.lists.getByTitle("Hub").items.getById(item.Id).update(properties).then(function () {
			dfd.resolve();
		})

		return dfd.promise;
	}




	getInfoOfPage = function () {
		var dfd = $q.defer();

		angular.element(document).ready(function () {

			var totalItem = $scope.items.length;

			var numPerPage = 0;

			angular.forEach($('#hubTable tbody tr'), function (value, key) {
				//$scope.totalItemOnPage++;
				numPerPage++;
			});

			$scope.currentPage = $('.pagination').find('li.paginate_button.active a').text();

			$scope.begin = (($scope.currentPage - 1) * $scope.totalItemOnPage), $scope.end = $scope.begin + numPerPage;

			dfd.resolve();
		});
		return dfd.promise;
	}

	/* Begin check all for checkbox */
	$scope.selectedAll = false;

	// Fn: check single entry
	$scope.selectEntity = function () {

		//getInfoOfPage().then(function(r) {

		for (var i = $scope.begin; i < $scope.end; i++) {
			if (!$scope.items[i].checked) {
				$scope.selectedAll = false;
				return;
			}
		}

		//If not the check the "allItemsSelected" checkbox
		$scope.selectedAll = true;
		//});

	};

	// Fn: Get current items on current page
	function getCurrentItemsOnCurrentPage() {
		$scope.listOfId = [];
		$("table").find('tr').each(function (i, el) {
			var $tds = $(this).find('td'), id = $tds.eq(1).text();
			$scope.listOfId.push(parseInt(id));
		});
		// Filter item by list of id
		return getItemsOnCurrentPage = $scope.listOfId.filter(function (el, i) {
			var j;
			for (j = 0; j < $scope.items.length; j++) {
				if ($scope.items[j].Id === el) {
					return $scope.items;
				}
			}
		});
	}

	//Function to select or deselect all items
	$scope.checkAll = function () {
		//@Tan to help khoa

		angular.element(document).ready(function () {

			if ($scope.sorted > 0 || $scope.searched > 0) {
				$scope.itemsOnCurrentPage = getCurrentItemsOnCurrentPage();
				for (var i = 0; i < $scope.itemsOnCurrentPage.length; i++) {
					for (var j = 0; j < $scope.items.length; j++) {
						if ($scope.itemsOnCurrentPage[i] == $scope.items[j].Id) {
							$scope.items[j].checked = $scope.selectedAll;
							$scope.$apply();
						}
					}

				}
			}
			else {
				$scope.begin = $('#hubTable').DataTable().page.info().start, $scope.end = $('#hubTable').DataTable().page.info().end;

				for (var i = $scope.begin; i < $scope.end; i++) {
					$scope.items[i].checked = $scope.selectedAll;
					$scope.$apply();
				}
			}

		});
	};

	// Fn: Event click on paging for datatable
	onClickPaginationButton = function () {
		angular.element(document).ready(function () {
			// On click page index        	
			$('#hubTable').on('page.dt', function () {
				resetCheckAllButton();

			});
		});
	}
	onClickPaginationButton();

	// Fn: Event click on select entries for datatable
	onClickDatatableLength = function () {
		angular.element(document).ready(function () {
			$('#hubTable').on('length.dt', function (e, settings, len) {
				$scope.totalItemOnPage = len;
				resetCheckAllButton();
			});
		});
	}
	onClickDatatableLength();

	// Fn: Event click on sort for datatable
	onClickSortBy = function () {
		angular.element(document).ready(function () {

			$('#hubTable').on('order.dt', function () {
				resetCheckAllButton();
				$scope.sorted++;
			});
		});
	}
	onClickSortBy();

	// Fn: Event click on search for datatable
	onSearchEvent = function () {
		angular.element(document).ready(function () {
			$('#hubTable').on('search.dt', function () {
				$scope.searched++;
			});
		});
	}
	onSearchEvent();

	// Fn: Reset check all button when current page exist only item doesn't checked
	resetCheckAllButton = function () {
		angular.element(document).ready(function () {
			$timeout(function () {

				if ($scope.sorted > 0) {
					$scope.itemsOnCurrentPage = getCurrentItemsOnCurrentPage();
					for (var i = 0; i < $scope.itemsOnCurrentPage.length; i++) {
						for (var j = 0; j < $scope.items.length; j++) {
							if ($scope.itemsOnCurrentPage[i] == $scope.items[j].Id) {
								if (!$scope.items[j].checked) {
									$scope.selectedAll = false;
									$scope.$apply();
									return;
								}
							}
						}
					}
					$scope.selectedAll = true;
				} else {
					$scope.begin = $('#hubTable').DataTable().page.info().start, $scope.end = $('#hubTable').DataTable().page.info().end;

					for (var i = $scope.begin; i < $scope.end; i++) {
						if (!$scope.items[i].checked) {
							$scope.selectedAll = false;
							$scope.$apply();
							return;
						}
					}

					//If not the check the "allItemsSelected" checkbox
					$scope.selectedAll = true;
				}
			}, 200);
		});
	}

	//Function for instant sharing
	$scope.clickInstantShare = function ($event, item) {
		$pnp.sp.web.lists.getByTitle("Hub").items.getById(item.Id).update({
			Current_x0020_Status: 'Instant Sharing',
			SharedTo: item.destinationPhysicianEmail,
			SharedToURL: item.destinationPhysicianLink,
			Access_x0020_expiration_x0020_date: moment().add(7, 'days')
		}).then(function () {
			getRecords().then(function (r) {
				reloadPageAndReconfigureDatatable();

			})
		})
	}

	//Function for instant sharing
	$scope.clickInstantRevoke = function ($event, item) {
		$pnp.sp.web.lists.getByTitle("Hub").items.getById(item.Id).update({
			Current_x0020_Status: 'Instant Revoke',
			SharedTo: null,
			SharedToURL: null,
			Access_x0020_expiration_x0020_date: null
		}).then(function () {
			getRecords().then(function (r) {
				reloadPageAndReconfigureDatatable();
			})
		})
	}
});
