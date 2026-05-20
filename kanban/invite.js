(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const statusEl = document.getElementById('invite-status');

  if (!token) {
    statusEl.textContent = '유효하지 않은 초대 링크입니다.';
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    sessionStorage.setItem('pendingInviteToken', token);
    window.location.href = new URL('login.html', window.location.href).href;
    return;
  }

  statusEl.textContent = '보드에 참여 중입니다...';

  const { data: invite } = await supabaseClient
    .from('board_invites')
    .select('board_owner_id')
    .eq('id', token)
    .single();

  if (!invite) {
    statusEl.textContent = '초대 링크를 찾을 수 없습니다.';
    return;
  }

  const user = await getUser();

  if (invite.board_owner_id === user.id) {
    window.location.href = new URL('index.html', window.location.href).href;
    return;
  }

  const { error } = await supabaseClient.from('board_members').upsert({
    board_owner_id: invite.board_owner_id,
    member_id: user.id,
  });

  if (error) {
    statusEl.textContent = '참여에 실패했습니다. 다시 시도해주세요.';
    return;
  }

  window.location.href = new URL(
    `index.html?board=${invite.board_owner_id}`,
    window.location.href
  ).href;
})();
