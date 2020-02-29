import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.css';
import './style/index.css';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import Overview from './components/overview';
import Register from './components/register';
import Edit from './components/edit';
import auth from './authenticate/auth';
import api from './api/api';
import NavBar from './components/navbar';
import Background from './img/background.jpg';

var config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const firebase = require('firebase/app');
require('firebase/firestore');
require('firebase/auth');

firebase.initializeApp(config);
var db = firebase.firestore();

class App extends React.Component {
  state = {
    organizations: [],
    organizationsName: [],
    selectedOrganization: '',
    messages: [],
    lines: []
  };

  componentDidMount() {
    this.setOrganizations();
  }

  setOrganizations = async () => {
    if (!this.props.userInfo.roles) {
      window.alert('You are not assigned to a company');
      window.location.href = this.props.userInfo.logoutUrl;
    }

    const allowedCodespaces = this.props.userInfo.roles
      .map(JSON.parse)
      .filter(({ r: role }) => role === 'editSX')
      .map(({ o: org }) => org);

    const response = await api.getAuthorities();
    const organizations = response.data.authorities.filter(authority =>
      allowedCodespaces.includes(authority.id.split(':')[0])
    );

    this.setState(
      {
        organizations: organizations.map(({ id }) => id),
        organizationsName: organizations.map(({ name }) => name),
        selectedOrganization: organizations[0].id
      },
      () => this.getMessagesAndLines()
    );
  };

  updateOrganization = selectedOrg => {
    this.setState(
      {
        selectedOrganization: selectedOrg
      },
      () => this.getMessagesAndLines()
    );
  };

  getMessagesAndLines = async () => {
    await this.getMessages();
    await this.getLines();
  };

  getMessages = async () => {
    if (this.unsubscribeSnapshotListener) {
      this.unsubscribeSnapshotListener();
    }
    const codespace = this.state.selectedOrganization.split(':')[0];
    const authority = this.state.selectedOrganization;
    this.unsubscribeSnapshotListener = db
      .collection(`codespaces/${codespace}/authorities/${authority}/messages`)
      .onSnapshot(this.onMessagesUpdate);
  };

  onMessagesUpdate = querySnapshot => {
    this.setState({
      messages:
        querySnapshot.size > 0
          ? querySnapshot.docs.map(doc => ({
              id: doc.id,
              data: doc.data()
            }))
          : []
    });
  };

  getLines = async () => {
    const response = await api.getLines(this.state.selectedOrganization);
    if (response.data) {
      this.setState({
        lines: response.data.lines
      });
    } else {
      console.log('Could not find any lines for this organization');
    }
  };

  render() {
    return (
      <Router>
        <div>
          <img className="background-image" src={Background} alt="" />

          <Route
            path="/"
            render={props => (
              <NavBar
                {...props}
                NavBar
                onSelectOrganization={this.updateOrganization}
                user={this.state.organizations}
                name={this.state.organizationsName}
                logout={this.props.userInfo.logoutUrl}
              />
            )}
          />
          <Route
            exact
            path="/"
            render={props => (
              <Overview {...props} messages={this.state.messages} />
            )}
          />
          <Route
            path="/edit/:id?"
            render={props => (
              <Edit
                {...props}
                issue={this.state.messages.find(
                  ({ id }) => id === props.match.params.id
                )}
                firebase={db}
                organization={this.state.selectedOrganization}
              />
            )}
          />
          <Route
            path="/register"
            render={props => (
              <Register
                {...props}
                firebase={db}
                lines={this.state.lines}
                organization={this.state.selectedOrganization}
              />
            )}
          />
        </div>
      </Router>
    );
  }
}

const renderIndex = userInfo => {
  ReactDOM.render(<App userInfo={userInfo} />, document.getElementById('root'));
};

auth.initAuth(token => {
  return fetch(
    'https://us-central1-deviation-messages.cloudfunctions.net/auth/firebase',
    {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }
  )
    .then(resp => resp.json())
    .then(({ firebaseToken }) =>
      firebase.auth().signInWithCustomToken(firebaseToken)
    );
});

export default renderIndex;
