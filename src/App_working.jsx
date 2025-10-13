import React, { useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc, 
  getDocs, 
  getDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

const App = () => {
  // Auth & User State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data State
  const [speakers, setSpeakers] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [seniorFellows, setSeniorFellows] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Form State
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);
  const [showInviteUserForm, setShowInviteUserForm] = useState(false);
  const [showEditSpeakerForm, setShowEditSpeakerForm] = useState(false);
  const [showEditConfirmedForm, setShowEditConfirmedForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Speaker Token Access
  const [speakerAccess, setSpeakerAccess] = useState(null);
  
  // Signup Token Access
  const [signupInvitation, setSignupInvitation] = useState(null);
  // eslint-disable-next-line
  const [loadingSignup, setLoadingSignup] = useState(false);

  // Load data functions - defined first
  const loadSpeakers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'speakers'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpeakers(data);
    } catch (error) {
      console.error('Error loading speakers:', error);
    }
  }, []);

  const loadAvailableDates = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'available_dates'), orderBy('date', 'asc'))
      );
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableDates(data);
    } catch (error) {
      console.error('Error loading dates:', error);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'invitations'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }, []);

  const loadSeniorFellows = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'user_roles'), where('role', 'in', ['Senior Fellow', 'Organizer']))
      );
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeniorFellows(data);
    } catch (error) {
      console.error('Error loading senior fellows:', error);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'user_roles'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(data);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    await Promise.all([
      loadSpeakers(),
      loadAvailableDates(),
      loadInvitations(),
      loadSeniorFellows(),
      loadAllUsers()
    ]);
  }, [loadSpeakers, loadAvailableDates, loadInvitations, loadSeniorFellows, loadAllUsers]);

  // Load speaker by token
  const loadSpeakerByToken = useCallback(async (token) => {
    try {
      const speakersRef = collection(db, 'speakers');
      const q = query(speakersRef, where('access_token', '==', token));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const speakerDoc = querySnapshot.docs[0];
        setSpeakerAccess({ id: speakerDoc.id, ...speakerDoc.data() });
        await loadAvailableDates();
      } else {
        alert('Invalid or expired invitation link');
      }
    } catch (error) {
      console.error('Error loading speaker:', error);
    }
  }, [loadAvailableDates]);

  // Load user role
  const loadUserRole = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'user_roles', uid));
      if (userDoc.exists()) {
        setUserRole({ id: uid, ...userDoc.data() });
        await loadData();
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  }, [loadData]);

  // Check for speaker token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      loadSpeakerByToken(token);
    }
  }, [loadSpeakerByToken]);

// Check for signup token in URL (add this after the speaker token useEffect)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const signupToken = urlParams.get('signup');
  if (signupToken && !user) {
    setLoadingSignup(true);
    const loadSignupInvitation = async () => {
      try {
        const invitationsRef = collection(db, 'invitations');
        const q = query(invitationsRef, where('token', '==', signupToken), where('used', '==', false));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const invDoc = querySnapshot.docs[0];
          const invitation = { id: invDoc.id, ...invDoc.data() };
          
          // Check if expired
          const expiresAt = invitation.expires_at.toDate();
          if (expiresAt < new Date()) {
            alert('This invitation has expired. Please contact the organizer for a new invitation.');
            setLoadingSignup(false);
            return;
          }
          
          setSignupInvitation(invitation);
        } else {
          alert('Invalid or already used invitation link.');
        }
        setLoadingSignup(false);
      } catch (error) {
        console.error('Error loading invitation:', error);
        alert('Error loading invitation. Please try again.');
        setLoadingSignup(false);
      }
    };
    loadSignupInvitation();
  }
}, [user]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserRole(currentUser.uid);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadUserRole]);

  // Login
  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // Signup from invitation
  const handleSignup = async (password) => {
    if (!signupInvitation) return;
    
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        signupInvitation.email, 
        password
      );
      
      // Add user to user_roles collection
      await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
        email: signupInvitation.email,
        full_name: signupInvitation.full_name,
        role: signupInvitation.role,
        createdAt: serverTimestamp()
      });
      
      // Mark invitation as used
      await updateDoc(doc(db, 'invitations', signupInvitation.id), {
        used: true,
        used_at: serverTimestamp()
      });
      
      // Clear signup state - user will be logged in automatically
      setSignupInvitation(null);
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('An account with this email already exists. Please login instead.');
      } else {
        alert('Signup failed: ' + error.message);
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Add Available Date
  const handleAddDate = async (formData) => {
    try {
      await addDoc(collection(db, 'available_dates'), {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        available: true,
        locked_by_id: null,
        createdAt: serverTimestamp()
      });
      await loadAvailableDates();
      setShowAddDateForm(false);
    } catch (error) {
      alert('Error adding date: ' + error.message);
    }
  };

  // Delete Available Date
  const handleDeleteDate = async (dateId) => {
    const date = availableDates.find(d => d.id === dateId);
    if (date && !date.available) {
      alert('Cannot delete a date that is locked by a speaker.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this date?')) {
      try {
        const dateRef = doc(db, 'available_dates', dateId);
        await updateDoc(dateRef, {
          available: false,
          locked_by_id: 'DELETED'
        });
        await loadAvailableDates();
      } catch (error) {
        alert('Error deleting date: ' + error.message);
      }
    }
  };

  // Add Speaker (Propose)
  const handleAddSpeaker = async (formData) => {
    try {
      const token = generateToken();
      await addDoc(collection(db, 'speakers'), {
        ...formData,
        status: 'Proposed',
        proposed_by_id: user.uid,
        proposed_by_name: userRole.full_name,
        access_token: token,
        createdAt: serverTimestamp()
      });
      await loadSpeakers();
      setShowAddSpeakerForm(false);
    } catch (error) {
      alert('Error adding speaker: ' + error.message);
    }
  };

// Delete Proposed Speaker
const handleDeleteSpeaker = async (speakerId) => {
  if (window.confirm('Are you sure you want to delete this speaker proposal?')) {
    try {
      await deleteDoc(doc(db, 'speakers', speakerId));
      await loadSpeakers();
      alert('Speaker deleted successfully!');
    } catch (error) {
      alert('Error deleting speaker: ' + error.message);
    }
  }
};

  // Accept Speaker (Organizer)
  const handleAcceptSpeaker = async (speakerId) => {
    try {
      const speaker = speakers.find(s => s.id === speakerId);
      const token = speaker.access_token || generateToken();
      
      await updateDoc(doc(db, 'speakers', speakerId), {
        status: 'Invited',
        access_token: token,
        invitation_sent_date: serverTimestamp(),
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      });
      
      // Generate invitation email content
      const inviteLink = `${window.location.origin}?token=${token}`;
      const emailSubject = 'Invitation to Present at Collaboratorium Barcelona';
      const emailBody = `Dear ${speaker.full_name},

We are delighted to invite you to present a seminar at the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona.

Your host will be ${speaker.host}.

Please visit the following link to accept and choose your preferred date:
${inviteLink}

This invitation will remain valid for 7 days. If you have any questions, please don't hesitate to reach out.

Best regards,
${userRole.full_name}`;

      // Create mailto link
      const mailtoLink = `mailto:${speaker.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client
      window.location.href = mailtoLink;
      
      await loadSpeakers();
      alert('Speaker accepted! Your email client should open with a draft email.');
    } catch (error) {
      alert('Error accepting speaker: ' + error.message);
    }
  };

  // Reject Speaker
  const handleRejectSpeaker = async (speakerId) => {
    if (window.confirm('Are you sure you want to reject this speaker?')) {
      try {
        await updateDoc(doc(db, 'speakers', speakerId), {
          status: 'Declined'
        });
        await loadSpeakers();
      } catch (error) {
        alert('Error rejecting speaker: ' + error.message);
      }
    }
  };

  // Edit Proposed Speaker
  const handleEditSpeaker = async (formData) => {
    try {
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), formData);
      await loadSpeakers();
      setShowEditSpeakerForm(false);
      setEditingSpeaker(null);
    } catch (error) {
      alert('Error updating speaker: ' + error.message);
    }
  };

  // Edit Confirmed Speaker
  const handleEditConfirmedSpeaker = async (formData) => {
    try {
      const updateData = {
        ...formData,
        assigned_date: formData.assigned_date ? Timestamp.fromDate(new Date(formData.assigned_date)) : null
      };
      
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), updateData);
      
      // If date changed, update the locked date
      if (formData.old_date_id && formData.new_date_id && formData.old_date_id !== formData.new_date_id) {
        // Unlock old date
        await updateDoc(doc(db, 'available_dates', formData.old_date_id), {
          available: true,
          locked_by_id: null,
          talk_title: ''
        });
        
        // Lock new date
        await updateDoc(doc(db, 'available_dates', formData.new_date_id), {
          available: false,
          locked_by_id: editingSpeaker.id,
          talk_title: formData.talk_title
        });
      } else if (formData.current_date_id) {
        // Just update the talk title on existing date
        await updateDoc(doc(db, 'available_dates', formData.current_date_id), {
          talk_title: formData.talk_title
        });
      }
      
      await loadSpeakers();
      await loadAvailableDates();
      setShowEditConfirmedForm(false);
      setEditingSpeaker(null);
    } catch (error) {
      alert('Error updating confirmed speaker: ' + error.message);
    }
  };

  // Speaker accepts invitation
  const handleSpeakerAccept = async (dateId, talkTitle, talkAbstract) => {
    try {
      // Lock the date
      await updateDoc(doc(db, 'available_dates', dateId), {
        available: false,
        locked_by_id: speakerAccess.id,
        talk_title: talkTitle
      });

      // Update speaker
      const selectedDate = availableDates.find(d => d.id === dateId);
      await updateDoc(doc(db, 'speakers', speakerAccess.id), {
        status: 'Accepted',
        assigned_date: selectedDate.date,
        talk_title: talkTitle,
        talk_abstract: talkAbstract || ''
      });

      alert('Thank you! Your presentation has been scheduled. The organizers will contact you shortly regarding travel arrangements.');
      
      // Reload data
      await loadAvailableDates();
      setSpeakerAccess({ ...speakerAccess, status: 'Accepted' });
    } catch (error) {
      alert('Error accepting invitation: ' + error.message);
    }
  };

  // Speaker declines invitation
  const handleSpeakerDecline = async () => {
    if (window.confirm('Are you sure you want to decline this invitation?')) {
      try {
        await updateDoc(doc(db, 'speakers', speakerAccess.id), {
          status: 'Declined'
        });
        alert('Your response has been recorded. Thank you for your time.');
        setSpeakerAccess({ ...speakerAccess, status: 'Declined' });
      } catch (error) {
        alert('Error declining invitation: ' + error.message);
      }
    }
  };

  // Generate random token
  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Create invitation for Senior Fellow
  const handleCreateInvitation = async (formData) => {
    try {
      const token = generateToken();
      const signupLink = `${window.location.origin}?signup=${token}`;
      
      await addDoc(collection(db, 'invitations'), {
        ...formData,
        token,
        invited_by_id: user.uid,
        invited_by_name: userRole.full_name,
        used: false,
        expires_at: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        createdAt: serverTimestamp()
      });

      // Create email
      const emailSubject = `Invitation to Join Collaboratorium Barcelona as ${formData.role}`;
      const emailBody = `Dear ${formData.full_name},

You have been invited to join the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona as a ${formData.role}.

Please use the following link to complete your registration:
${signupLink}

This invitation will remain valid for 30 days.

Best regards,
${userRole.full_name}`;

      // Create mailto link
      const mailtoLink = `mailto:${formData.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client
      window.location.href = mailtoLink;

      await loadInvitations();
      setShowInviteUserForm(false);
      alert('Invitation created! Your email client should open with a draft email.');
    } catch (error) {
      alert('Error creating invitation: ' + error.message);
    }
  };

  // Edit existing user
  const handleEditUser = async (formData) => {
    try {
      await updateDoc(doc(db, 'user_roles', editingUser.id), {
        full_name: formData.full_name,
        role: formData.role
      });
      await loadAllUsers();
      await loadSeniorFellows();
      setShowEditUserForm(false);
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      alert('Error updating user: ' + error.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === user.uid) {
      alert('You cannot delete your own account!');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${userEmail} from the system? This will remove their access but not delete their authentication account.`)) {
      try {
        await deleteDoc(doc(db, 'user_roles', userId));
        await loadAllUsers();
        await loadSeniorFellows();
        alert('User removed successfully!');
      } catch (error) {
        alert('Error removing user: ' + error.message);
      }
    }
  };

  // Send password reset email
  const handlePasswordReset = async (email) => {
    if (window.confirm(`Send password reset email to ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert(`Password reset email sent to ${email}. They should receive it shortly.`);
      } catch (error) {
        alert('Error sending password reset email: ' + error.message);
      }
    }
  };

  // Get ranking color
  const getRankingColor = (ranking) => {
    switch (ranking) {
      case 'High Priority': return '#ff4444';
      case 'Medium Priority': return '#ffaa00';
      case 'Low Priority': return '#44ff44';
      default: return '#999';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Proposed': return '#999';
      case 'Invited': return '#0088ff';
      case 'Accepted': return '#00cc00';
      case 'Declined': return '#ff4444';
      default: return '#999';
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // If loading (but not if we have a signup invitation ready)
  if ((loading || loadingSignup) && !signupInvitation) {
    console.log('Showing loading screen', { loading, loadingSignup, hasSignupInvitation: !!signupInvitation });
    return <div style={styles.loading}>Loading...</div>;
  }

  // Signup View (from invitation link) - HIGHEST PRIORITY
  if (signupInvitation && !user) {
    console.log('Showing signup view');
    return <SignupView invitation={signupInvitation} onSignup={handleSignup} />;
  }

  // Speaker Access View (no login required)
  if (speakerAccess) {
    console.log('Showing speaker access view');
    return <SpeakerAccessView 
      speaker={speakerAccess}
      availableDates={availableDates}
      onAccept={handleSpeakerAccept}
      onDecline={handleSpeakerDecline}
      formatDate={formatDate}
    />;
  }

  // Login View
  if (!user) {
    console.log('Showing login view');
    return <LoginView onLogin={handleLogin} />;
  }

  // Loading user role after login
  if (user && !userRole) {
    console.log('Loading user data');
    return <div style={styles.loading}>Loading user data...</div>;
  }

  // Main Dashboard
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Seminar Management System</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{userRole?.full_name} ({userRole?.role})</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{...styles.navBtn, ...(activeTab === 'dashboard' ? styles.navBtnActive : {})}}>
          Dashboard
        </button>
        {userRole?.role === 'Organizer' && (
          <>
            <button 
              onClick={() => setActiveTab('dates')} 
              style={{...styles.navBtn, ...(activeTab === 'dates' ? styles.navBtnActive : {})}}>
              Available Dates
            </button>
            <button 
              onClick={() => setActiveTab('speakers')} 
              style={{...styles.navBtn, ...(activeTab === 'speakers' ? styles.navBtnActive : {})}}>
              All Speakers
            </button>
            <button 
              onClick={() => setActiveTab('propose')} 
              style={{...styles.navBtn, ...(activeTab === 'propose' ? styles.navBtnActive : {})}}>
              Propose Speaker
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              style={{...styles.navBtn, ...(activeTab === 'users' ? styles.navBtnActive : {})}}>
              Manage Users
            </button>
            <button 
              onClick={() => setActiveTab('invitations')} 
              style={{...styles.navBtn, ...(activeTab === 'invitations' ? styles.navBtnActive : {})}}>
              User Invitations
            </button>
          </>
        )}
        {userRole?.role === 'Senior Fellow' && (
          <button 
            onClick={() => setActiveTab('propose')} 
            style={{...styles.navBtn, ...(activeTab === 'propose' ? styles.navBtnActive : {})}}>
            Propose Speaker
          </button>
        )}
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView 
            userRole={userRole}
            speakers={speakers}
            availableDates={availableDates}
            onAcceptSpeaker={handleAcceptSpeaker}
            onRejectSpeaker={handleRejectSpeaker}
            onEditSpeaker={(speaker) => {
              setEditingSpeaker(speaker);
              setShowEditSpeakerForm(true);
            }}
            onEditConfirmed={(speaker) => {
              setEditingSpeaker(speaker);
              setShowEditConfirmedForm(true);
            }}
            getRankingColor={getRankingColor}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {/* Available Dates (Organizer) */}
        {activeTab === 'dates' && userRole?.role === 'Organizer' && (
          <DatesView 
            dates={availableDates.filter(d => d.locked_by_id !== 'DELETED')}
            speakers={speakers}
            onAddDate={() => setShowAddDateForm(true)}
            onDeleteDate={handleDeleteDate}
            formatDate={formatDate}
          />
        )}

        {/* All Speakers (Organizer) */}
        {activeTab === 'speakers' && userRole?.role === 'Organizer' && (
          <AllSpeakersView 
            speakers={speakers}
            getRankingColor={getRankingColor}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {/* Manage Users (Organizer) */}
        {activeTab === 'users' && userRole?.role === 'Organizer' && (
          <ManageUsersView 
            users={allUsers}
            currentUserId={user.uid}
            onEditUser={(user) => {
              setEditingUser(user);
              setShowEditUserForm(true);
            }}
            onDeleteUser={handleDeleteUser}
            onPasswordReset={handlePasswordReset}
            formatDate={formatDate}
          />
        )}

        {/* User Invitations (Organizer) */}
        {activeTab === 'invitations' && userRole?.role === 'Organizer' && (
          <InvitationsView 
            invitations={invitations}
            onCreateInvitation={() => setShowInviteUserForm(true)}
            formatDate={formatDate}
          />
        )}

        {/* Propose Speaker (Organizer & Senior Fellow) */}
        {activeTab === 'propose' && (
          <ProposeSpeakerView 
            onAddSpeaker={() => setShowAddSpeakerForm(true)}
            speakers={speakers.filter(s => s.proposed_by_id === user.uid)}
            getRankingColor={getRankingColor}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Add Date Modal */}
      {showAddDateForm && (
        <AddDateForm 
          onSubmit={handleAddDate}
          onCancel={() => setShowAddDateForm(false)}
          existingDates={availableDates}
          formatDate={formatDate}
        />
      )}

      {/* Add Speaker Modal */}
      {showAddSpeakerForm && (
        <AddSpeakerForm 
          onSubmit={handleAddSpeaker}
          onCancel={() => setShowAddSpeakerForm(false)}
          seniorFellows={seniorFellows}
          currentUser={userRole}
        />
      )}

      {/* Edit Speaker Modal */}
      {showEditSpeakerForm && editingSpeaker && (
        <EditSpeakerForm 
          speaker={editingSpeaker}
          onSubmit={handleEditSpeaker}
          onCancel={() => {
            setShowEditSpeakerForm(false);
            setEditingSpeaker(null);
          }}
          seniorFellows={seniorFellows}
        />
      )}

      {/* Edit Confirmed Speaker Modal */}
      {showEditConfirmedForm && editingSpeaker && (
        <EditConfirmedSpeakerForm 
          speaker={editingSpeaker}
          availableDates={availableDates}
          onSubmit={handleEditConfirmedSpeaker}
          onCancel={() => {
            setShowEditConfirmedForm(false);
            setEditingSpeaker(null);
          }}
          formatDate={formatDate}
        />
      )}

      {/* Invite User Modal */}
      {showInviteUserForm && (
        <InviteUserForm 
          onSubmit={handleCreateInvitation}
          onCancel={() => setShowInviteUserForm(false)}
        />
      )}

      {/* Edit User Modal */}
      {showEditUserForm && editingUser && (
        <EditUserForm 
          user={editingUser}
          onSubmit={handleEditUser}
          onCancel={() => {
            setShowEditUserForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

// Login Component
const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h2 style={styles.loginTitle}>Seminar Management Login</h2>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitBtn}>Login</button>
        </form>
      </div>
    </div>
  );
};

// Signup Component
const SignupView = ({ invitation, onSignup }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    onSignup(password);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h2 style={styles.loginTitle}>Create Your Account</h2>
        <p style={styles.signupWelcome}>
          Welcome, <strong>{invitation.full_name}</strong>!
        </p>
        <p style={styles.signupInfo}>
          You've been invited to join as a <strong>{invitation.role}</strong>.
          <br />
          Please create a password to complete your registration.
        </p>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="email"
            value={invitation.email}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />
          <input
            type="password"
            placeholder="Create Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitBtn}>Create Account</button>
        </form>
      </div>
    </div>
  );
};

// Speaker Access View
const SpeakerAccessView = ({ speaker, availableDates, onAccept, onDecline, formatDate }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [talkTitle, setTalkTitle] = useState('');
  const [talkAbstract, setTalkAbstract] = useState('');

  if (speaker.status === 'Accepted') {
    return (
      <div style={styles.speakerContainer}>
        <div style={styles.speakerBox}>
          <h2 style={styles.speakerTitle}>✓ Invitation Accepted</h2>
          <p>Thank you, {speaker.full_name}! Your presentation has been confirmed.</p>
          <p>The organizers will contact you shortly about travel arrangements.</p>
        </div>
      </div>
    );
  }

  if (speaker.status === 'Declined') {
    return (
      <div style={styles.speakerContainer}>
        <div style={styles.speakerBox}>
          <h2 style={styles.speakerTitle}>Invitation Declined</h2>
          <p>Thank you for your response, {speaker.full_name}.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !talkTitle.trim()) {
      alert('Please select a date and enter a talk title');
      return;
    }
    onAccept(selectedDate, talkTitle, talkAbstract);
  };

  const availableDatesForSpeaker = availableDates.filter(d => d.available && d.locked_by_id !== 'DELETED');

  return (
    <div style={styles.speakerContainer}>
      <div style={styles.speakerBox}>
        <h2 style={styles.speakerTitle}>Seminar Invitation</h2>
        <p style={styles.speakerText}>Dear {speaker.full_name},</p>
        <p style={styles.speakerText}>
          You have been invited to present a seminar on <strong>{speaker.area_of_expertise}</strong>.
        </p>
        <p style={styles.speakerText}>Host: {speaker.host}</p>

        <form onSubmit={handleSubmit} style={styles.speakerForm}>
          <label style={styles.label}>Talk Title: *</label>
          <input
            type="text"
            value={talkTitle}
            onChange={(e) => setTalkTitle(e.target.value)}
            style={styles.input}
            placeholder="Enter your talk title"
            required
          />

          <label style={styles.label}>Talk Abstract (Optional):</label>
          <textarea
            value={talkAbstract}
            onChange={(e) => setTalkAbstract(e.target.value)}
            style={{...styles.input, minHeight: '100px', resize: 'vertical'}}
            placeholder="Enter a brief abstract of your talk"
          />

          <label style={styles.label}>Select Available Date: *</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">-- Choose a date --</option>
            {availableDatesForSpeaker.map(date => (
              <option key={date.id} value={date.id}>
                {formatDate(date.date)} - {date.host} {date.notes ? `(${date.notes})` : ''}
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={{...styles.submitBtn, ...styles.acceptBtn}}>
              Accept Invitation
            </button>
            <button 
              type="button" 
              onClick={onDecline} 
              style={{...styles.submitBtn, ...styles.declineBtn}}>
              Decline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

  // Dashboard View
  const DashboardView = ({ userRole, speakers, availableDates, onAcceptSpeaker, onRejectSpeaker, onEditSpeaker, onEditConfirmed, getRankingColor, getStatusColor, formatDate }) => {
  // Safety check
  if (!userRole) {
    return <div style={styles.emptyText}>Loading user data...</div>;
  }

  if (userRole.role === 'Organizer') {
    const proposedSpeakers = speakers.filter(s => s.status === 'Proposed');
    const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
    const acceptedSpeakers = speakers.filter(s => s.status === 'Accepted');

    return (
      <div>
        <h2 style={styles.sectionTitle}>Organizer Dashboard</h2>
        
        {/* Proposed Speakers */}
        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>Proposed Speakers Awaiting Approval ({proposedSpeakers.length})</h3>
          {proposedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No speakers pending approval</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Affiliation</th>
                  <th style={styles.th}>Expertise</th>
                  <th style={styles.th}>Ranking</th>
                  <th style={styles.th}>Host</th>
                  <th style={styles.th}>Proposed By</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposedSpeakers.map(speaker => (
                  <tr key={speaker.id}>
                    <td style={styles.td}>{speaker.full_name}</td>
                    <td style={styles.td}>{speaker.email}</td>
                    <td style={styles.td}>{speaker.affiliation}</td>
                    <td style={styles.td}>{speaker.area_of_expertise}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getRankingColor(speaker.ranking)
                      }}>
                        {speaker.ranking}
                      </span>
                    </td>
                    <td style={styles.td}>{speaker.host}</td>
                    <td style={styles.td}>{speaker.proposed_by_name}</td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => onEditSpeaker(speaker)}
                        style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                        Edit
                      </button>
                      <button 
                        onClick={() => onAcceptSpeaker(speaker.id)}
                        style={{...styles.actionBtn, ...styles.acceptBtn}}>
                        Accept
                      </button>
                      <button 
                        onClick={() => onRejectSpeaker(speaker.id)}
                        style={{...styles.actionBtn, ...styles.declineBtn}}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invited Speakers */}
        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>Invited Speakers Awaiting Response ({invitedSpeakers.length})</h3>
          {invitedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No pending invitations</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Invited On</th>
                  <th style={styles.th}>Deadline</th>
                  <th style={styles.th}>Host</th>
                </tr>
              </thead>
              <tbody>
                {invitedSpeakers.map(speaker => (
                  <tr key={speaker.id}>
                    <td style={styles.td}>{speaker.full_name}</td>
                    <td style={styles.td}>{speaker.email}</td>
                    <td style={styles.td}>{formatDate(speaker.invitation_sent_date)}</td>
                    <td style={styles.td}>{formatDate(speaker.response_deadline)}</td>
                    <td style={styles.td}>{speaker.host}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Accepted Speakers */}
        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>Confirmed Speakers ({acceptedSpeakers.length})</h3>
          {acceptedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No confirmed speakers yet</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Talk Title</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Host</th>
                  <th style={styles.th}>Abstract</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {acceptedSpeakers.map(speaker => (
                  <tr key={speaker.id}>
                    <td style={styles.td}>{speaker.full_name}</td>
                    <td style={styles.td}>{speaker.talk_title || 'TBD'}</td>
                    <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                    <td style={styles.td}>{speaker.host}</td>
                    <td style={styles.td}>
                      {speaker.talk_abstract ? (
                        <span style={styles.abstractPreview} title={speaker.talk_abstract}>
                          {speaker.talk_abstract.substring(0, 50)}...
                        </span>
                      ) : (
                        <em style={{color: '#999'}}>No abstract</em>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => onEditConfirmed(speaker)}
                        style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Senior Fellow Dashboard
  const mySpeakers = speakers.filter(s => s.proposed_by_id === userRole.id);
  const allProposedSpeakers = speakers.filter(s => s.status === 'Proposed');
  const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
  const acceptedSpeakers = speakers.filter(s => s.status === 'Accepted');

  return (
    <div>
      <h2 style={styles.sectionTitle}>Senior Fellow Dashboard</h2>
      
      {/* All Proposed Speakers */}
      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>All Proposed Speakers ({allProposedSpeakers.length})</h3>
        {allProposedSpeakers.length === 0 ? (
          <p style={styles.emptyText}>No speakers have been proposed yet</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Affiliation</th>
                <th style={styles.th}>Expertise</th>
                <th style={styles.th}>Ranking</th>
                <th style={styles.th}>Host</th>
                <th style={styles.th}>Proposed By</th>
              </tr>
            </thead>
            <tbody>
              {allProposedSpeakers.map(speaker => (
                <tr key={speaker.id} style={speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}}>
                  <td style={styles.td}>
                    {speaker.full_name}
                    {speaker.proposed_by_id === userRole.id && (
                      <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                        (You)
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{speaker.affiliation}</td>
                  <td style={styles.td}>{speaker.area_of_expertise}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getRankingColor(speaker.ranking)
                    }}>
                      {speaker.ranking}
                    </span>
                  </td>
                  <td style={styles.td}>{speaker.host}</td>
                  <td style={styles.td}>{speaker.proposed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invited Speakers */}
      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>Invited Speakers Awaiting Response ({invitedSpeakers.length})</h3>
        {invitedSpeakers.length === 0 ? (
          <p style={styles.emptyText}>No pending invitations</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Expertise</th>
                <th style={styles.th}>Host</th>
                <th style={styles.th}>Invited On</th>
                <th style={styles.th}>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {invitedSpeakers.map(speaker => (
                <tr key={speaker.id} style={speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}}>
                  <td style={styles.td}>
                    {speaker.full_name}
                    {speaker.proposed_by_id === userRole.id && (
                      <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                        (Your proposal)
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{speaker.email}</td>
                  <td style={styles.td}>{speaker.area_of_expertise}</td>
                  <td style={styles.td}>{speaker.host}</td>
                  <td style={styles.td}>{formatDate(speaker.invitation_sent_date)}</td>
                  <td style={styles.td}>{formatDate(speaker.response_deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Accepted Speakers */}
      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>Confirmed Speakers ({acceptedSpeakers.length})</h3>
        {acceptedSpeakers.length === 0 ? (
          <p style={styles.emptyText}>No confirmed speakers yet</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Talk Title</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Host</th>
                <th style={styles.th}>Proposed By</th>
              </tr>
            </thead>
            <tbody>
              {acceptedSpeakers.map(speaker => (
                <tr key={speaker.id} style={speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}}>
                  <td style={styles.td}>
                    {speaker.full_name}
                    {speaker.proposed_by_id === userRole.id && (
                      <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                        (Your proposal)
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{speaker.talk_title || 'TBD'}</td>
                  <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                  <td style={styles.td}>{speaker.host}</td>
                  <td style={styles.td}>{speaker.proposed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* My Proposed Speakers Summary */}
      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>My Proposals Summary</h3>
        <p style={{fontSize: '16px', color: '#555'}}>
          You have proposed <strong>{mySpeakers.length}</strong> speaker(s):
        </p>
        <ul style={{fontSize: '15px', color: '#555', lineHeight: '1.8'}}>
          <li>Proposed: <strong>{mySpeakers.filter(s => s.status === 'Proposed').length}</strong></li>
          <li>Invited (awaiting response): <strong>{mySpeakers.filter(s => s.status === 'Invited').length}</strong></li>
          <li>Accepted: <strong>{mySpeakers.filter(s => s.status === 'Accepted').length}</strong></li>
          <li>Declined: <strong>{mySpeakers.filter(s => s.status === 'Declined').length}</strong></li>
        </ul>
      </div>
    </div>
  );
};

// Dates View
const DatesView = ({ dates, speakers, onAddDate, onDeleteDate, formatDate }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Available Dates</h2>
        <button onClick={onAddDate} style={styles.addBtn}>+ Add Date</button>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Talk Title</th>
            <th style={styles.th}>Host</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Locked By</th>
            <th style={styles.th}>Notes</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dates.map(date => {
            const lockedSpeaker = speakers.find(s => s.id === date.locked_by_id);
            return (
              <tr key={date.id}>
                <td style={styles.td}>{formatDate(date.date)}</td>
                <td style={styles.td}>{date.talk_title || '-'}</td>
                <td style={styles.td}>{date.host}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: date.available ? '#00cc00' : '#ff4444'
                  }}>
                    {date.available ? 'Available' : 'Locked'}
                  </span>
                </td>
                <td style={styles.td}>{lockedSpeaker?.full_name || '-'}</td>
                <td style={styles.td}>{date.notes || '-'}</td>
                <td style={styles.td}>
                  {date.available && (
                    <button 
                      onClick={() => onDeleteDate(date.id)}
                      style={{...styles.actionBtn, ...styles.declineBtn}}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// All Speakers View
const AllSpeakersView = ({ speakers, getRankingColor, getStatusColor, formatDate }) => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>All Speakers</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Affiliation</th>
            <th style={styles.th}>Expertise</th>
            <th style={styles.th}>Ranking</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Host</th>
            <th style={styles.th}>Proposed By</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {speakers.map(speaker => (
            <tr key={speaker.id}>
              <td style={styles.td}>{speaker.full_name}</td>
              <td style={styles.td}>{speaker.email}</td>
              <td style={styles.td}>{speaker.affiliation}</td>
              <td style={styles.td}>{speaker.area_of_expertise}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: getRankingColor(speaker.ranking)
                }}>
                  {speaker.ranking}
                </span>
              </td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: getStatusColor(speaker.status)
                }}>
                  {speaker.status}
                </span>
              </td>
              <td style={styles.td}>{speaker.host}</td>
              <td style={styles.td}>{speaker.proposed_by_name}</td>
              <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Invitations View
const InvitationsView = ({ invitations, onCreateInvitation, formatDate }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>User Invitations</h2>
        <button onClick={onCreateInvitation} style={styles.addBtn}>+ Create Invitation</button>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Invited By</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Expires</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(inv => (
            <tr key={inv.id}>
              <td style={styles.td}>{inv.email}</td>
              <td style={styles.td}>{inv.full_name}</td>
              <td style={styles.td}>{inv.role}</td>
              <td style={styles.td}>{inv.invited_by_name}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: inv.used ? '#999' : '#00cc00'
                }}>
                  {inv.used ? 'Used' : 'Active'}
                </span>
              </td>
              <td style={styles.td}>{formatDate(inv.expires_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Manage Users View
const ManageUsersView = ({ users, currentUserId, onEditUser, onDeleteUser, onPasswordReset, formatDate }) => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Manage Users</h2>
      <div style={styles.section}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={styles.td}>
                  {user.full_name}
                  {user.id === currentUserId && <span style={{color: '#3498db', marginLeft: '8px'}}>(You)</span>}
                </td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: user.role === 'Organizer' ? '#3498db' : '#9b59b6'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>{formatDate(user.createdAt)}</td>
                <td style={styles.td}>
                  <button 
                    onClick={() => onEditUser(user)}
                    style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                    Edit
                  </button>
                  <button 
                    onClick={() => onPasswordReset(user.email)}
                    style={{...styles.actionBtn, backgroundColor: '#3498db'}}>
                    Reset Password
                  </button>
                  {user.id !== currentUserId && (
                    <button 
                      onClick={() => onDeleteUser(user.id, user.email)}
                      style={{...styles.actionBtn, ...styles.declineBtn}}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Propose Speaker View
const ProposeSpeakerView = ({ onAddSpeaker, speakers, getRankingColor, getStatusColor, formatDate, onEditSpeaker, onDeleteSpeaker }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Propose Speaker</h2>
        <button onClick={onAddSpeaker} style={styles.addBtn}>+ Propose New Speaker</button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>My Proposed Speakers</h3>
        {speakers.length === 0 ? (
          <p style={styles.emptyText}>You haven't proposed any speakers yet</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Affiliation</th>
                <th style={styles.th}>Expertise</th>
                <th style={styles.th}>Ranking</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {speakers.map(speaker => (
                <tr key={speaker.id}>
                  <td style={styles.td}>{speaker.full_name}</td>
                  <td style={styles.td}>{speaker.email}</td>
                  <td style={styles.td}>{speaker.affiliation}</td>
                  <td style={styles.td}>{speaker.area_of_expertise}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getRankingColor(speaker.ranking)
                    }}>
                      {speaker.ranking}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getStatusColor(speaker.status)
                    }}>
                      {speaker.status}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                  <td style={styles.td}>
                    {speaker.status === 'Proposed' && (
                      <>
                        <button 
                          onClick={() => onEditSpeaker(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                          Edit
                        </button>
                        <button 
                          onClick={() => onDeleteSpeaker(speaker.id)}
                          style={{...styles.actionBtn, ...styles.declineBtn}}>
                          Delete
                        </button>
                      </>
                    )}
                    {speaker.status !== 'Proposed' && (
                      <em style={{color: '#999', fontSize: '13px'}}>
                        {speaker.status === 'Invited' && 'Awaiting response'}
                        {speaker.status === 'Accepted' && 'Confirmed'}
                        {speaker.status === 'Declined' && 'Declined'}
                      </em>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Add Date Form
const AddDateForm = ({ onSubmit, onCancel, existingDates, formatDate }) => {
  const [formData, setFormData] = useState({
    date: '',
    host: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Sort existing dates by date (exclude deleted)
  const activeDates = existingDates.filter(d => d.locked_by_id !== 'DELETED');
  const sortedDates = [...activeDates].sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return dateA - dateB;
  });

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Add Available Date</h3>
        
        {/* Show existing dates */}
        {activeDates.length > 0 && (
          <div style={styles.existingDatesContainer}>
            <h4 style={styles.existingDatesTitle}>Existing Dates:</h4>
            <div style={styles.existingDatesList}>
              {sortedDates.map(date => (
                <div 
                  key={date.id} 
                  style={{
                    ...styles.existingDateItem,
                    backgroundColor: date.available ? '#d4edda' : '#cce5ff',
                    borderLeft: `4px solid ${date.available ? '#28a745' : '#007bff'}`
                  }}
                >
                  <div style={styles.existingDateInfo}>
                    <strong>{formatDate(date.date)}</strong>
                    <span style={styles.existingDateStatus}>
                      {date.available ? '● Available' : '● Locked'}
                    </span>
                  </div>
                  <div style={styles.existingDateDetails}>
                    {date.talk_title && <span>"{date.talk_title}" - </span>}
                    Host: {date.host}
                    {date.notes && ` (${date.notes})`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Date:</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Host:</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.input}
            placeholder="Host name"
            required
          />

          <label style={styles.label}>Notes:</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            style={styles.input}
            placeholder="Room, time, etc."
          />

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Add Date</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Speaker Form
const AddSpeakerForm = ({ onSubmit, onCancel, seniorFellows, currentUser }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    affiliation: '',
    area_of_expertise: '',
    ranking: 'Medium Priority',
    host: currentUser?.full_name || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Propose Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Area of Expertise:</label>
          <input
            type="text"
            value={formData.area_of_expertise}
            onChange={(e) => setFormData({...formData, area_of_expertise: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Priority Ranking:</label>
          <select
            value={formData.ranking}
            onChange={(e) => setFormData({...formData, ranking: e.target.value})}
            style={styles.select}
          >
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>

          <label style={styles.label}>Host:</label>
          <select
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Host --</option>
            {seniorFellows.map(fellow => (
              <option key={fellow.id} value={fellow.full_name}>
                {fellow.full_name} ({fellow.role})
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Propose Speaker</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Speaker Form (for Proposed speakers)
const EditSpeakerForm = ({ speaker, onSubmit, onCancel, seniorFellows }) => {
  const [formData, setFormData] = useState({
    full_name: speaker.full_name,
    email: speaker.email,
    affiliation: speaker.affiliation,
    area_of_expertise: speaker.area_of_expertise,
    ranking: speaker.ranking,
    host: speaker.host
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Area of Expertise:</label>
          <input
            type="text"
            value={formData.area_of_expertise}
            onChange={(e) => setFormData({...formData, area_of_expertise: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Priority Ranking:</label>
          <select
            value={formData.ranking}
            onChange={(e) => setFormData({...formData, ranking: e.target.value})}
            style={styles.select}
          >
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>

          <label style={styles.label}>Host:</label>
          <select
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Host --</option>
            {seniorFellows.map(fellow => (
              <option key={fellow.id} value={fellow.full_name}>
                {fellow.full_name} ({fellow.role})
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Confirmed Speaker Form
const EditConfirmedSpeakerForm = ({ speaker, availableDates, onSubmit, onCancel, formatDate }) => {
  // Find current locked date
  const currentLockedDate = availableDates.find(d => d.locked_by_id === speaker.id);
  
  const [formData, setFormData] = useState({
    talk_title: speaker.talk_title || '',
    talk_abstract: speaker.talk_abstract || '',
    host: speaker.host,
    assigned_date: speaker.assigned_date ? 
      (speaker.assigned_date.toDate ? speaker.assigned_date.toDate().toISOString().split('T')[0] : 
       new Date(speaker.assigned_date).toISOString().split('T')[0]) : '',
    current_date_id: currentLockedDate?.id || null,
    new_date_id: currentLockedDate?.id || null,
    old_date_id: currentLockedDate?.id || null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Available dates + current locked date (excluding deleted)
  const selectableDates = availableDates.filter(d => 
    (d.available || d.id === currentLockedDate?.id) && d.locked_by_id !== 'DELETED'
  );

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit Confirmed Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Talk Title:</label>
          <input
            type="text"
            value={formData.talk_title}
            onChange={(e) => setFormData({...formData, talk_title: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Talk Abstract:</label>
          <textarea
            value={formData.talk_abstract}
            onChange={(e) => setFormData({...formData, talk_abstract: e.target.value})}
            style={{...styles.input, minHeight: '120px', resize: 'vertical'}}
            placeholder="Enter talk abstract..."
          />

          <label style={styles.label}>Host:</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Assigned Date:</label>
          <select
            value={formData.new_date_id || ''}
            onChange={(e) => {
              const selectedDateId = e.target.value;
              const selectedDate = availableDates.find(d => d.id === selectedDateId);
              setFormData({
                ...formData, 
                new_date_id: selectedDateId,
                assigned_date: selectedDate?.date ? 
                  (selectedDate.date.toDate ? selectedDate.date.toDate().toISOString().split('T')[0] : 
                   new Date(selectedDate.date).toISOString().split('T')[0]) : ''
              });
            }}
            style={styles.select}
            required
          >
            <option value="">-- Select Date --</option>
            {selectableDates.map(date => (
              <option key={date.id} value={date.id}>
                {formatDate(date.date)} - {date.host} {date.notes ? `(${date.notes})` : ''} 
                {date.id === currentLockedDate?.id ? ' (Current)' : ''}
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite User Form
const InviteUserForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'Senior Fellow'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Create User Invitation</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Role:</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            style={styles.select}
          >
            <option value="Senior Fellow">Senior Fellow</option>
            <option value="Organizer">Organizer</option>
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Create Invitation</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Form
const EditUserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    role: user.role
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit User</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={user.email}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />

          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Role:</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            style={styles.select}
          >
            <option value="Senior Fellow">Senior Fellow</option>
            <option value="Organizer">Organizer</option>
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '24px',
    color: '#666',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userName: {
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  nav: {
    backgroundColor: '#34495e',
    padding: '0',
    display: 'flex',
    gap: '0',
  },
  navBtn: {
    padding: '15px 25px',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s',
  },
  navBtnActive: {
    backgroundColor: '#2c3e50',
    borderBottom: '3px solid #3498db',
  },
  content: {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '28px',
    color: '#2c3e50',
    margin: '0 0 20px 0',
  },
  subsectionTitle: {
    fontSize: '20px',
    color: '#34495e',
    margin: '0 0 15px 0',
  },
  section: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    color: '#2c3e50',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  actionBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    marginRight: '5px',
    color: 'white',
  },
  acceptBtn: {
    backgroundColor: '#27ae60',
  },
  declineBtn: {
    backgroundColor: '#e74c3c',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    minWidth: '500px',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '22px',
    color: '#2c3e50',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginTop: '15px',
    marginBottom: '5px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#2c3e50',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    minWidth: '400px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  },
  loginTitle: {
    margin: '0 0 30px 0',
    fontSize: '24px',
    color: '#2c3e50',
    textAlign: 'center',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  signupWelcome: {
    fontSize: '16px',
    color: '#2c3e50',
    marginBottom: '10px',
    textAlign: 'center',
  },
  signupInfo: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  speakerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  speakerBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  speakerTitle: {
    margin: '0 0 20px 0',
    fontSize: '26px',
    color: '#2c3e50',
  },
  speakerText: {
    marginBottom: '15px',
    fontSize: '16px',
    color: '#34495e',
    lineHeight: '1.6',
  },
  speakerForm: {
    marginTop: '30px',
  },
  existingDatesContainer: {
    marginBottom: '25px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  existingDatesTitle: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    color: '#2c3e50',
    fontWeight: '600',
  },
  existingDatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  existingDateItem: {
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  existingDateInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  existingDateStatus: {
    fontSize: '12px',
    fontWeight: '600',
  },
  existingDateDetails: {
    fontSize: '12px',
    color: '#555',
  },
  abstractPreview: {
    fontSize: '13px',
    color: '#555',
    cursor: 'help',
  },
};

export default App;
