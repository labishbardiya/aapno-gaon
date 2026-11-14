import { getLanguage } from '../lib/locale';
import InstallMenu from './install-menu';
import { Box, Container, Divider, Paper, Text, Title } from '@mantine/core';

export default async function Home() {
  const hi = await getLanguage() === 'hi';
  return (
    <>
      <header className="site-header">
        <Container size="lg"><a href="/">mySociety<span>.</span></a><InstallMenu /></Container>
      </header>
      <main>
        <Container size="lg" className="landing">
          <Box className="intro">
            <Title order={1}>{hi ? 'समस्या दर्ज करें' : 'Report an issue'}<br />in your area.</Title>
            <Text size="xl">From broken streetlights to water shortages, tell us what needs attention and follow its progress.</Text>
          </Box>
          <Paper component="section" className="guide" radius="lg" p="xl" aria-labelledby="guide-title">
            <Title order={2} id="guide-title">{hi ? 'यह कैसे काम करता है' : 'How it works'}</Title>
            <ol>
              <li><strong>Describe the issue.</strong> Choose a category and add a nearby landmark.</li>
              <li><strong>Keep your ticket ID.</strong> Use it to find your report again.</li>
              <li><strong>Follow the update.</strong> See when staff pick up and resolve the issue.</li>
            </ol>
            <Divider my="lg" />
            <nav className="home-links" aria-label="Reports"><a href="/report">{hi ? 'समस्या दर्ज करें' : 'Report an issue'}</a><a href="/register">{hi ? 'रिपोर्ट देखें' : 'Browse reports'}</a><a href="/overview">{hi ? 'वार्ड सारांश' : 'Ward overview'}</a><a href="/services">{hi ? 'सामुदायिक सेवाएँ' : 'Community services'}</a><a href="/staff">{hi ? 'कर्मचारी लॉगिन' : 'Staff sign-in'}</a></nav>
          </Paper>
        </Container>
      </main>
    </>
  );
}
