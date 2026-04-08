import { Container, Typography, Paper, Box, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function PrivacyPolicy() {
  const { t } = useTranslation()

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('privacy.title')}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {t('privacy.lastUpdated', { date: '2026-04-09' })}
        </Typography>

        <Section title={t('privacy.introduction.title')}>
          <Typography paragraph>
            {t('privacy.introduction.content')}
          </Typography>
        </Section>

        <Section title={t('privacy.dataCollected.title')}>
          <Typography paragraph>
            {t('privacy.dataCollected.intro')}
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography>
                <strong>{t('privacy.dataCollected.players.title')}</strong>
                {' '}{t('privacy.dataCollected.players.content')}
              </Typography>
            </li>
            <li>
              <Typography>
                <strong>{t('privacy.dataCollected.admin.title')}</strong>
                {' '}{t('privacy.dataCollected.admin.content')}
              </Typography>
            </li>
            <li>
              <Typography>
                <strong>{t('privacy.dataCollected.gameData.title')}</strong>
                {' '}{t('privacy.dataCollected.gameData.content')}
              </Typography>
            </li>
          </Box>
        </Section>

        <Section title={t('privacy.howWeUse.title')}>
          <Typography paragraph>
            {t('privacy.howWeUse.intro')}
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li><Typography>{t('privacy.howWeUse.items.runQuiz')}</Typography></li>
            <li><Typography>{t('privacy.howWeUse.items.displayLeaderboard')}</Typography></li>
            <li><Typography>{t('privacy.howWeUse.items.adminAccess')}</Typography></li>
          </Box>
        </Section>

        <Section title={t('privacy.cookies.title')}>
          <Typography paragraph>
            {t('privacy.cookies.content')}
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography>
                <strong>{t('privacy.cookies.auth.title')}</strong>
                {' '}{t('privacy.cookies.auth.content')}
              </Typography>
            </li>
            <li>
              <Typography>
                <strong>{t('privacy.cookies.language.title')}</strong>
                {' '}{t('privacy.cookies.language.content')}
              </Typography>
            </li>
          </Box>
        </Section>

        <Section title={t('privacy.thirdParty.title')}>
          <Typography paragraph>
            {t('privacy.thirdParty.content')}
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography>
                <strong>{t('privacy.thirdParty.google.title')}</strong>
                {' '}{t('privacy.thirdParty.google.content')}{' '}
                <Link href="https://policies.google.com/privacy" target="_blank" rel="noopener">
                  {t('privacy.thirdParty.google.link')}
                </Link>
              </Typography>
            </li>
          </Box>
        </Section>

        <Section title={t('privacy.dataRetention.title')}>
          <Typography paragraph>
            {t('privacy.dataRetention.content')}
          </Typography>
        </Section>

        <Section title={t('privacy.dataSecurity.title')}>
          <Typography paragraph>
            {t('privacy.dataSecurity.content')}
          </Typography>
        </Section>

        <Section title={t('privacy.yourRights.title')}>
          <Typography paragraph>
            {t('privacy.yourRights.content')}
          </Typography>
        </Section>

        <Section title={t('privacy.contact.title')}>
          <Typography paragraph>
            {t('privacy.contact.content')}{' '}
            <Link href="mailto:thomasphansen@gmail.com">
              thomasphansen@gmail.com
            </Link>
          </Typography>
        </Section>

        <Section title={t('privacy.changes.title')}>
          <Typography paragraph>
            {t('privacy.changes.content')}
          </Typography>
        </Section>
      </Paper>
    </Container>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}
