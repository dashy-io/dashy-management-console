/*jshint camelcase: false */
'use strict';

var apiHost = 'http://api.dashy.io';

hello.init({
    google: '955388086787-1llsm4tuo5tbn050f0huu37kc17j6rru.apps.googleusercontent.com'
}, {
    redirect_uri: 'http://localhost:9000/'
});

angular.module('dashyAdmin').controller('LoginCtrl', ['$window', '$rootScope', 'LoginService', function($window, $rootScope, LoginService) {

    var _this = this;

    _this.hideLogin = true;

    $rootScope.$on('userLogout', function() {
        _this.hideLogin = false;
    });

    $rootScope.$on('userLoggedIn', function() {
        _this.hideLogin = true;
        _this.user = LoginService.currentUser;
    });

    _this.logout = function() {
        LoginService.logout();
    };

    this.login = function() {
        LoginService.login();
    };

    $window.hello.on('auth.login', function(auth) {

        console.log('im in');
        console.log(auth);

        $window.hello(auth.network).api('/me').then(function(r) {
            console.log(r);
        });

        LoginService.authenticateGoogleUser(auth.authResponse.access_token);
    });

    this.logout = function() {
        LoginService.logout();
    };

}]);


angular.module('dashyAdmin').service('LoginService', ['$window', '$http', '$rootScope', '$state', function($window, $http, $rootScope, $state) {

    var _this = this;

    _this.loginStatus = '';

    function setStatus(status) {
        if (_this.loginStatus !== status) {
            console.log('LoginService status: ' + status);
            _this.loginStatus = status;
        }
    }

    this.login = function login() {
        $window.hello('google').login();
    };

    this.logout = function logout() {
        $window.hello('google').logout();
    };

    this.authenticateGoogleUser = function(token) {

        $http.post(apiHost + '/auth/google/login', {
                access_token: token
            })
            .success(function(data) {
                _this.token = data.token;
                console.log('loginGoogleUser() POST ~/api/google/authenticate success:', _this.token);
                if (_this.existingUser !== false) {
                    _this.existingUser = true;
                }
                $http.defaults.headers.common.Authorization = 'Bearer ' + _this.token;
                getUser();
            })
            .error(function(data, status) {
                if (status === 403) {
                    console.log('loginGoogleUser() POST ~/api/google/authenticate user not signed up:', data, status);
                    _this.existingUser = false;
                    signupGoogleUser();
                } else {
                    console.log('loginGoogleUser() POST ~/api/google/authenticate error:', data, status);
                    setStatus('logged_out');
                    // _this.reset();
                }
            });
    };

    function getUser() {
        $http.get(apiHost + '/user')
            .success(function(data) {
                _this.user = data;
                console.log('getUser() GET ~/api/user success:', _this.user);
                setStatus('logged_in');
                _this.currentUser = {
                    id: _this.user.id,
                    name: _this.user.name,
                    imageUrl: _this.user.imageUrl
                };
                $rootScope.$emit('userLoggedIn');
                $state.go('dashboardsList');
            })
            .error(function(data, status) {
                console.log('getUser() GET ~/api/user error:', data, status);
                setStatus('logged_out');
                _this.reset();
            });
    }

    function signupGoogleUser() {
        $http.post(apiHost + '/auth/google/signup', {
                access_token: _this.authStatus.access_token
            })
            .success(function(data) {
                console.log('signupGoogleUser() POST ~/api/google/signup success:', data);
                this.authenticateGoogleUser();
            })
            .error(function(data, status) {
                console.log('signupGoogleUser() POST ~/api/google/signup error:', data, status);
                // setStatus('logged_out');
                _this.reset();
            });
    }

}]);