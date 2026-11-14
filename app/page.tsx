import InstallMenu from './install-menu';
import { Box, Container, Divider, Paper, Text, Title } from '@mantine/core';

export default function Home() {
  return (
    <>
      <header className="site-header">
        <Container size="lg"><a href="/">mySociety<span>.</span></a><InstallMenu /></Container>
      </header>
      <main>
        <Container size="lg" className="landing">
          <Box className="intro">
            <Title order={1}>Report an issue<br />in your area.</Title>
            <Text size="xl">From broken streetlights to water shortages, tell us what needs attention and follow its progress.</Text>
          </Box>
          <Paper component="section" className="guide" radius="lg" p="xl" aria-labelledby="guide-title">
            <Title order={2} id="guide-title">How it works</Title>
            <ol>
              <li><strong>Describe the issue.</strong> Choose a category and add a nearby landmark.</li>
              <li><strong>Keep your ticket ID.</strong> Use it to find your report again.</li>
              <li><strong>Follow the update.</strong> See when staff pick up and resolve the issue.</li>
            </ol>
            <Divider my="lg" />
            <nav className="home-links" aria-label="Reports"><a href="/report">Report an issue</a><a href="/register">Browse reports</a><a href="/overview">Ward overview</a><a href="/services">Community services</a><a href="/staff">Staff sign-in</a></nav>
          </Paper>
        </Container>
      </main>
    </>
  );
}
